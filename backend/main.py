from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile, os, uuid, shutil
from conciliador import conciliar

app = FastAPI(title="RGF Conciliador", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS: dict[str, dict] = {}

@app.post("/conciliar")
async def conciliar_endpoint(
    rascunho: UploadFile = File(...),
    homologado: UploadFile = File(...),
):
    job_id = str(uuid.uuid4())
    tmp_dir = tempfile.mkdtemp()

    try:
        r_path = os.path.join(tmp_dir, f"rascunho_{rascunho.filename}")
        h_path = os.path.join(tmp_dir, f"homologado_{homologado.filename}")

        with open(r_path, "wb") as f:
            f.write(await rascunho.read())
        with open(h_path, "wb") as f:
            f.write(await homologado.read())

        out_path = os.path.join(tmp_dir, f"conciliado_{job_id}.xlsx")
        result = conciliar(r_path, h_path, out_path)

        JOBS[job_id] = {
            "status": "ok",
            "path": out_path,
            "tmp_dir": tmp_dir,
            "stats": result,
        }

        return {
            "job_id": job_id,
            "stats": result,
        }

    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{job_id}")
def download(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return FileResponse(
        job["path"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="RGF_Conciliado.xlsx",
    )


@app.get("/health")
def health():
    return {"status": "ok"}
