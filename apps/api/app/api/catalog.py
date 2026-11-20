from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import CatalogResponse, CatalogTrack
from app.services import bank

router = APIRouter(tags=["catalog"])


@router.get("/catalog", response_model=CatalogResponse)
def get_catalog(db: Session = Depends(get_db)) -> CatalogResponse:
    tracks = [CatalogTrack(**t) for t in bank.catalog(db)]
    return CatalogResponse(tracks=tracks)
