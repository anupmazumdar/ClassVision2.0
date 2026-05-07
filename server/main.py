from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn, os

app = FastAPI(title="ClassVision API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def root(): return {"status": "ClassVision running", "version": "1.0.0"}

@app.get("/health")
def health(): return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host=os.getenv("SERVER_HOST","0.0.0.0"), port=int(os.getenv("SERVER_PORT",8000)), reload=True)
