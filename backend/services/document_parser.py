import os
import io
import re
import logging
from typing import Tuple
from fastapi import UploadFile, HTTPException

logger = logging.getLogger("mindweave.parser")

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
MAX_CHARS_FOR_AI = 15000  # Safe context window limit

def clean_extracted_text(text: str) -> str:
    # Replace multiple newlines and spaces
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    import fitz  # PyMuPDF
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_pieces = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            page_text = page.get_text()
            if page_text:
                text_pieces.append(page_text)
        doc.close()
        return clean_extracted_text("\n\n".join(text_pieces))
    except Exception as e:
        logger.error(f"PyMuPDF error: {e}")
        raise ValueError(f"Could not extract text from PDF: {str(e)}")

def extract_text_from_docx(file_bytes: bytes) -> str:
    import docx
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return clean_extracted_text("\n\n".join(paragraphs))
    except Exception as e:
        logger.error(f"python-docx error: {e}")
        raise ValueError(f"Could not extract text from DOCX: {str(e)}")

def extract_text_from_txt(file_bytes: bytes) -> str:
    for encoding in ["utf-8", "latin-1", "cp1252"]:
        try:
            return clean_extracted_text(file_bytes.decode(encoding))
        except UnicodeDecodeError:
            continue
    raise ValueError("Could not decode TXT file with standard encodings (UTF-8, Latin-1).")

async def parse_and_validate_upload(file: UploadFile) -> Tuple[str, str]:
    """
    Validates file format, size, extracts content, and returns (filename, extracted_text).
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = {".pdf", ".docx", ".txt"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Supported formats: .pdf, .docx, .txt"
        )

    # Read bytes
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 10MB limit.")

    try:
        if ext == ".pdf":
            extracted = extract_text_from_pdf(content)
        elif ext == ".docx":
            extracted = extract_text_from_docx(content)
        else:
            extracted = extract_text_from_txt(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process document: {str(e)}")

    if not extracted or len(extracted.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="The document contained insufficient or unreadable text. Please provide a document with legible text."
        )

    # Truncate if larger than safe context ceiling
    if len(extracted) > MAX_CHARS_FOR_AI:
        extracted = extracted[:MAX_CHARS_FOR_AI] + "\n\n...[Content truncated for analysis]..."

    return file.filename, extracted
