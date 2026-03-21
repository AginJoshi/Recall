import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "recall_demo")

mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client[DB_NAME]

app = FastAPI(title="Recall Demo", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/testAddPerson")
async def testInsertPerson():
    """Insert one test person; auto-creates the `people` collection."""
    res = await db.people.insert_one(
        {
            "name": "Test Person",
            "relationship": "Friend",
            "lastConversation": "Met at the cafe.",
        }
    )
    return {"inserted_id": str(res.inserted_id)}

@app.post("/")
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
