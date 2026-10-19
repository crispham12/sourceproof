"""
SourceProof AI — FastAPI Backend (MVP Hackathon 10h)
Chức năng:
1. POST /api/extract-text: Rút trích văn bản từ file .pdf và .docx (giới hạn 3000 ký tự, chặn PDF ảnh quét).
2. POST /api/verify:
   - Bước 1: Tách 3-5 Claim học thuật quan trọng nhất kèm câu gốc và từ khóa trọng tâm.
   - Bước 2: Định vị chính xác vị trí từ khóa (start_index, end_index, Đoạn/Câu) bằng thuật toán khớp chuỗi.
   - Bước 3: Kiểm chứng song song từng Claim bằng Gemini API + Google Search Grounding.
   - Bước 4: Đánh giá độ tin cậy của nguồn (.gov, .edu, Nature, Britannica, Reuters...) và trả về JSON chuẩn.
"""

import asyncio
import io
import json
import os
import re
from typing import List, Optional
from urllib.parse import urlparse

from docx import Document
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from pypdf import PdfReader

load_dotenv()

app = FastAPI(
    title="SourceProof AI API",
    description="API kiểm chứng thông tin học thuật với Gemini & Google Search Grounding",
    version="1.0.0",
)

# Cấu hình CORS mở rộng để React Frontend gọi API không bị chặn khi chạy local/deploy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_CHAR_LIMIT = 3000
MIN_EXTRACTED_CHARS = 20
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


# =====================================================================
# 1. KHUÔN MẪU DỮ LIỆU (PYDANTIC SCHEMAS)
# =====================================================================

class VerifyRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Văn bản học thuật cần kiểm chứng")


class SourceItem(BaseModel):
    title: str
    url: str
    credibility: str        # VERY_HIGH | HIGH | MEDIUM | LOW
    credibility_label: str  # Nhãn tiếng Việt hiển thị trên UI


class LocationInfo(BaseModel):
    original_sentence: str
    keyword: str
    start_index: int
    end_index: int
    position_label: str


class ClaimResult(BaseModel):
    id: int
    claim_text: str
    status: str             # SUPPORTED | CONTRADICTED | INSUFFICIENT
    status_label: str       # Chính xác | Sai thông tin | Chưa đủ bằng chứng
    location: LocationInfo
    explanation: str
    correction: Optional[str] = None
    search_queries: List[str] = []
    sources: List[SourceItem] = []


class SummaryStats(BaseModel):
    total_claims: int
    supported_count: int
    contradicted_count: int
    insufficient_count: int


class VerifyResponse(BaseModel):
    summary: SummaryStats
    claims: List[ClaimResult]


# =====================================================================
# 2. CÁC HÀM BỔ TRỢ (ĐỊNH VỊ TỪ KHÓA & ĐÁNH GIÁ ĐỘ TIN CẬY NGUỒN)
# =====================================================================

VERY_HIGH_DOMAINS = (
    ".gov", ".gov.vn", ".edu", ".edu.vn", ".ac.uk", ".ac.jp",
    "who.int", "worldbank.org", "un.org", "unesco.org",
    "chinhphu.vn", "moet.gov.vn", "nasa.gov", "nih.gov",
)

HIGH_DOMAINS = (
    "britannica.com", "nature.com", "science.org", "ieee.org",
    "springer.com", "sciencedirect.com", "ncbi.nlm.nih.gov",
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk",
    "wikipedia.org", "scholar.google.com", "oxfordreference.com",
)

LOW_DOMAINS = (
    "reddit.com", "quora.com", "facebook.com", "tiktok.com",
    "twitter.com", "x.com", "threads.net", "tumblr.com",
    "blogspot.com", "wordpress.com", "medium.com",
)


def evaluate_source_credibility(url: str, title: str = "") -> tuple[str, str]:
    """Phân loại mức độ uy tín của nguồn dựa trên tên miền (Domain) và tiêu đề."""
    combined = f"{url.lower()} {title.lower()}"
    for domain in VERY_HIGH_DOMAINS:
        if domain in combined:
            return "VERY_HIGH", "Nguồn chính thống / Học thuật rất cao"
    for domain in HIGH_DOMAINS:
        if domain in combined:
            return "HIGH", "Nguồn học thuật / Báo chí uy tín cao"
    for domain in LOW_DOMAINS:
        if domain in combined:
            return "LOW", "Nguồn cộng đồng / Độ tin cậy thấp"
    return "MEDIUM", "Nguồn tham khảo trung bình"


def locate_keyword_in_text(full_text: str, original_sentence: str, keyword: str) -> LocationInfo:
    """
    Tìm vị trí chính xác (start_index, end_index) và tính Đoạn mấy / Câu mấy
    mà không phụ thuộc vào việc đếm ký tự của AI.
    """
    # 1. Xác định vị trí câu gốc trong văn bản
    sentence_clean = original_sentence.strip()
    sent_start = full_text.find(sentence_clean)
    if sent_start == -1:
        # Fallback: tìm không phân biệt hoa thường
        sent_start = full_text.lower().find(sentence_clean.lower())

    # 2. Tìm vị trí keyword bên trong câu gốc (ưu tiên) hoặc trong toàn văn bản
    kw_clean = keyword.strip() if keyword else sentence_clean
    start_idx = -1

    if sent_start != -1 and kw_clean:
        rel_idx = full_text[sent_start : sent_start + len(sentence_clean)].lower().find(kw_clean.lower())
        if rel_idx != -1:
            start_idx = sent_start + rel_idx
            end_idx = start_idx + len(kw_clean)

    if start_idx == -1 and kw_clean:
        start_idx = full_text.lower().find(kw_clean.lower())
        end_idx = start_idx + len(kw_clean) if start_idx != -1 else -1

    if start_idx == -1 and sent_start != -1:
        start_idx = sent_start
        end_idx = sent_start + len(sentence_clean)
        kw_clean = sentence_clean

    # 3. Tính "Đoạn X, Câu Y" dựa trên vị trí xuất hiện
    ref_pos = sent_start if sent_start != -1 else max(0, start_idx)
    prefix_text = full_text[:ref_pos]
    paragraphs_before = [p for p in prefix_text.split("\n") if p.strip()]
    para_num = len(paragraphs_before) + 1 if prefix_text.endswith("\n") else max(1, len(paragraphs_before))

    current_para = prefix_text.split("\n")[-1] if "\n" in prefix_text else prefix_text
    sentences_before = [s for s in re.split(r"[.!?]+", current_para) if s.strip()]
    sent_num = len(sentences_before) + 1

    return LocationInfo(
        original_sentence=sentence_clean,
        keyword=kw_clean,
        start_index=start_idx,
        end_index=end_idx if start_idx != -1 else -1,
        position_label=f"Đoạn {para_num}, Câu {sent_num}",
    )


def extract_json_from_text(raw_text: str) -> dict | list:
    """Trích xuất JSON an toàn từ câu trả lời của Gemini (kể cả khi bọc trong ```json ... ```)."""
    if not raw_text:
        return {}
    cleaned = re.sub(r"```(?:json)?", "", raw_text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
    return {}


def get_gemini_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Thiếu biến môi trường GEMINI_API_KEY trên server.",
        )
    return genai.Client(api_key=api_key)


# =====================================================================
# 3. LUỒNG AI CỐT LÕI: TÁCH CLAIM & KIỂM CHỨNG GOOGLE SEARCH GROUNDING
# =====================================================================

def extract_academic_claims(client: genai.Client, text: str) -> List[dict]:
    """Bước 1: Tách tối đa 3-5 Claim học thuật quan trọng nhất từ văn bản."""
    prompt = f"""
Bạn là hệ thống phân tích học thuật SourceProof AI.
Hãy đọc văn bản dưới đây và trích xuất tối đa 3 đến 5 khẳng định (claims) quan trọng nhất có thể kiểm chứng đúng/sai (sự kiện lịch sử, số liệu khoa học, năm tháng, định luật, địa lý, tác giả, công nghệ...).
BỎ QUA các câu cảm thán hoặc ý kiến cá nhân không thể kiểm chứng.

Yêu cầu trả về DUY NHẤT một chuỗi JSON chuẩn theo cấu trúc sau (không giải thích thêm):
{{
  "claims": [
    {{
      "claim_text": "Câu khẳng định ngắn gọn, rõ nghĩa cần kiểm chứng",
      "original_sentence": "Trích nguyên văn 100% câu gốc chứa khẳng định đó trong văn bản",
      "keyword": "Trích nguyên văn cụm từ khóa trọng tâm (ví dụ: số liệu, năm tháng, tên riêng) nằm trong câu gốc"
    }}
  ]
}}

Văn bản cần phân tích:
\"\"\"{text}\"\"\"
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )
    parsed = extract_json_from_text(response.text)
    claims = parsed.get("claims", []) if isinstance(parsed, dict) else []
    return claims[:5]


def verify_single_claim_sync(
    client: genai.Client, idx: int, claim_item: dict, full_text: str
) -> ClaimResult:
    """
    Bước 2: Kiểm chứng 1 Claim với công cụ Google Search Grounding.
    Trích xuất nguồn thực tế từ grounding_metadata.grounding_chunks.
    """
    claim_text = claim_item.get("claim_text", "").strip()
    original_sentence = claim_item.get("original_sentence", claim_text).strip()
    keyword = claim_item.get("keyword", "").strip()

    prompt = f"""
Bạn là chuyên gia kiểm chứng học thuật của SourceProof AI.
Hãy sử dụng Google Search để kiểm chứng khẳng định (claim) sau đây:
Claim: "{claim_text}"
Câu gốc trong bài của học sinh: "{original_sentence}"
Từ khóa đang xét: "{keyword}"

Nguyên tắc bắt buộc:
1. Dựa hoàn toàn vào bằng chứng tìm được từ Google Search (ưu tiên nguồn chính phủ .gov, giáo dục .edu, bách khoa toàn thư Britannica/Wikipedia, tạp chí khoa học Nature/IEEE, báo chí uy tín).
2. Chọn 1 trong 3 trạng thái:
   - "SUPPORTED": Có bằng chứng đáng tin cậy xác nhận claim là ĐÚNG.
   - "CONTRADICTED": Bằng chứng đáng tin cậy chỉ ra claim bị SAI (sai năm, sai số liệu, sai tên, sai bản chất...).
   - "INSUFFICIENT": Chưa có đủ bằng chứng rõ ràng hoặc các nguồn mâu thuẫn nhau (không tự suy đoán).
3. Nếu status là "CONTRADICTED", hãy chỉ rõ cụm từ khóa bị sai trong bài của học sinh ở trường "target_keyword" và cung cấp thông tin đúng ngắn gọn ở trường "correction".

Hãy trả về kết quả dưới dạng JSON (chỉ trả về JSON):
{{
  "status": "SUPPORTED" | "CONTRADICTED" | "INSUFFICIENT",
  "target_keyword": "Cụm từ khóa đúng hoặc sai nằm trong câu gốc của học sinh",
  "explanation": "Giải thích ngắn gọn 1-2 câu tiếng Việt dựa trên nguồn tìm được",
  "correction": "Thông tin đính chính chuẩn xác (nếu CONTRADICTED, ngược lại để null)"
}}
"""
    grounding_tool = types.Tool(google_search=types.GoogleSearch())
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[grounding_tool],
            temperature=0.1,
        ),
    )

    verdict_data = extract_json_from_text(response.text)
    if not isinstance(verdict_data, dict):
        verdict_data = {}

    status = verdict_data.get("status", "INSUFFICIENT").upper()
    if status not in ("SUPPORTED", "CONTRADICTED", "INSUFFICIENT"):
        status = "INSUFFICIENT"

    status_label_map = {
        "SUPPORTED": "Chính xác",
        "CONTRADICTED": "Sai thông tin",
        "INSUFFICIENT": "Chưa đủ bằng chứng",
    }

    refined_keyword = verdict_data.get("target_keyword") or keyword
    explanation = verdict_data.get(
        "explanation",
        "Chưa tìm thấy đủ dữ liệu đối chiếu từ các nguồn học thuật đáng tin cậy.",
    )
    correction = verdict_data.get("correction") if status == "CONTRADICTED" else None

    # Trích xuất nguồn tham khảo thực tế (Citations) từ grounding_metadata
    sources: List[SourceItem] = []
    search_queries: List[str] = []
    seen_urls = set()

    if response.candidates:
        metadata = getattr(response.candidates[0], "grounding_metadata", None)
        if metadata:
            raw_queries = getattr(metadata, "web_search_queries", None) or []
            search_queries = list(raw_queries)

            chunks = getattr(metadata, "grounding_chunks", None) or []
            for chunk in chunks:
                web_info = getattr(chunk, "web", None)
                if web_info and getattr(web_info, "uri", None):
                    uri = web_info.uri
                    title = getattr(web_info, "title", None) or urlparse(uri).netloc or "Nguồn tham khảo"
                    if uri not in seen_urls:
                        seen_urls.add(uri)
                        cred_code, cred_label = evaluate_source_credibility(uri, title)
                        sources.append(
                            SourceItem(
                                title=title,
                                url=uri,
                                credibility=cred_code,
                                credibility_label=cred_label,
                            )
                        )

    # Sắp xếp nguồn theo thứ tự độ tin cậy giảm dần (VERY_HIGH -> HIGH -> MEDIUM -> LOW)
    cred_rank = {"VERY_HIGH": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    sources.sort(key=lambda s: cred_rank.get(s.credibility, 4))

    # Nếu không có nguồn nào trả về mà AI tự kết luận, hạ về INSUFFICIENT để đảm bảo nguyên tắc Grounding
    if not sources and status != "INSUFFICIENT":
        status = "INSUFFICIENT"
        explanation += " (Lưu ý: Hệ thống chuyển về trạng thái Chưa đủ bằng chứng do không trích xuất được đường dẫn nguồn trực tiếp)."

    location_info = locate_keyword_in_text(full_text, original_sentence, refined_keyword)

    return ClaimResult(
        id=idx,
        claim_text=claim_text,
        status=status,
        status_label=status_label_map[status],
        location=location_info,
        explanation=explanation,
        correction=correction,
        search_queries=search_queries,
        sources=sources[:4],
    )


# =====================================================================
# 4. CÁC API ENDPOINTS
# =====================================================================

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "SourceProof AI Backend"}


@app.post("/api/extract-text")
async def extract_text_from_file(file: UploadFile = File(...)):
    """API rút trích chữ từ file .pdf hoặc .docx cho học sinh."""
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in (".pdf", ".docx"):
        raise HTTPException(
            status_code=400,
            detail="Định dạng không hỗ trợ. Vui lòng chỉ tải lên file PDF (.pdf) hoặc Word (.docx).",
        )

    content_bytes = await file.read()
    if len(content_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File vượt quá dung lượng tối đa 5MB.",
        )

    extracted_text = ""
    try:
        if ext == ".pdf":
            reader = PdfReader(io.BytesIO(content_bytes))
            pages_text = [page.extract_text() or "" for page in reader.pages[:10]]
            extracted_text = "\n".join(pages_text).strip()
        elif ext == ".docx":
            doc = Document(io.BytesIO(content_bytes))
            extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()]).strip()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể đọc nội dung file. Vui lòng kiểm tra lại file ({str(exc)}).",
        )

    # Chốt chặn an toàn 1: Chặn PDF dạng ảnh chụp (Scanned PDF)
    if len(extracted_text) < MIN_EXTRACTED_CHARS:
        raise HTTPException(
            status_code=422,
            detail="File PDF/Word này không chứa văn bản (có thể là ảnh chụp trang sách). Vui lòng tải lên file có chữ hoặc dán trực tiếp văn bản.",
        )

    # Chốt chặn an toàn 2: Cắt giới hạn 3000 ký tự để tránh timeout khi demo
    is_truncated = len(extracted_text) > MAX_CHAR_LIMIT
    final_text = extracted_text[:MAX_CHAR_LIMIT] if is_truncated else extracted_text

    return {
        "success": True,
        "filename": filename,
        "extracted_text": final_text,
        "is_truncated": is_truncated,
        "message": (
            f"Đã trích xuất {MAX_CHAR_LIMIT} ký tự đầu tiên để đảm bảo tốc độ kiểm chứng."
            if is_truncated
            else "Trích xuất văn bản thành công."
        ),
    }


@app.post("/api/verify", response_model=VerifyResponse)
async def verify_academic_content(payload: VerifyRequest):
    """API cốt lõi: Tách Claim -> Tìm kiếm Google Search Grounding -> Đối chiếu & Định vị từ khóa."""
    input_text = payload.text.strip()[:MAX_CHAR_LIMIT]
    client = get_gemini_client()

    try:
        raw_claims = await asyncio.to_thread(extract_academic_claims, client, input_text)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Lỗi khi phân tích câu khẳng định từ Gemini API: {str(exc)}",
        )

    if not raw_claims:
        return VerifyResponse(
            summary=SummaryStats(
                total_claims=0,
                supported_count=0,
                contradicted_count=0,
                insufficient_count=0,
            ),
            claims=[],
        )

    # Chạy song song việc kiểm chứng từng Claim để rút ngắn thời gian phản hồi xuống 3-5 giây
    tasks = [
        asyncio.to_thread(verify_single_claim_sync, client, idx + 1, item, input_text)
        for idx, item in enumerate(raw_claims)
    ]
    results: List[ClaimResult] = await asyncio.gather(*tasks)

    supported = sum(1 for r in results if r.status == "SUPPORTED")
    contradicted = sum(1 for r in results if r.status == "CONTRADICTED")
    insufficient = sum(1 for r in results if r.status == "INSUFFICIENT")

    return VerifyResponse(
        summary=SummaryStats(
            total_claims=len(results),
            supported_count=supported,
            contradicted_count=contradicted,
            insufficient_count=insufficient,
        ),
        claims=results,
    )