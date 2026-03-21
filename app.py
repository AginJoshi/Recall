import os
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from bson import ObjectId

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "recall_demo")
mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client[DB_NAME]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PersonCreate(BaseModel):
    name: str
    relationship: str
    lastConversation: Optional[str] = None
    embedding: Optional[list[float]] = None
    occupation: Optional[str] = None
    organization: Optional[str] = None


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    lastConversation: Optional[str] = None
    embedding: Optional[list[float]] = None
    occupation: Optional[str] = None
    organization: Optional[str] = None


class EncounterUpdate(BaseModel):
    summary: str


class PersonOut(PersonCreate):
    id: str = Field(alias="_id")
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True

def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/people", response_model=PersonOut)
async def create_person(person: PersonCreate):
    now = datetime.utcnow()
    profile = person.model_dump()
    profile["createdAt"] = now
    profile["updatedAt"] = now
    result = await db.people.insert_one(profile)
    profile["_id"] = str(result.inserted_id)
    return profile

@app.get("/people", response_model=List[PersonOut])
async def list_people():
    profiles = await db.people.find().sort("updatedAt", -1).to_list(length=200)
    for profile in profiles:
        profile["_id"] = str(profile["_id"])
    return profiles

@app.patch("/people/{person_id}", response_model=PersonOut)
async def update_person(person_id: str, person: PersonUpdate):
    objectID = to_object_id(person_id)
    update = person.model_dump(exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updatedAt"] = datetime.utcnow()
    result = await db.people.find_one_and_update(
        {"_id": objectID},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Person not found")
    result["_id"] = str(result["_id"])
    return result

@app.get("/people/{person_id}")
async def get_person(person_id: str):
    objectID = to_object_id(person_id)
    profile = await db.people.findOne({"_id: objectID"})
    if not profile:
        raise HTTPException(status_code=404, detail="Person not found")
    profile["_id"] = str(profile["_id"])
    return profile

# payload should be a JSON object with fields summary:str
@app.post("/people/{person_id}/encounter", response_model=PersonOut)
async def record_encounter(person_id: str, payload: EncounterUpdate):
    objectID = to_object_id(person_id)
    update = {
        "lastConversation": payload.summary,
        "updatedAt": datetime.utcnow(),
    }
    result = await db.people.find_one_and_update(
        {"_id": objectID},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Person not found")
    result["_id"] = str(result["_id"])
    return result


if __name__ == "__main__":
    import asyncio

    async def main():
        try:
            await mongo_client.admin.command("ping")
            print("Ping ok")
            res = await db.people.insert_one(
                {"name": "Test Person", "relationship": "Friend"}
            )
            print("Inserted into recall_demo.people, _id:", res.inserted_id)
        except Exception as e:
            print("Connection or insert failed:", e)

    asyncio.run(main())
