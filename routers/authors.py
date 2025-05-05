from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Author, Book
from schemas import Author as AuthorSchema, AuthorCreate
from auth import get_current_user
from models import User
from sqlalchemy import func

router = APIRouter(prefix="/authors", tags=["authors"])

def is_admin(user):
    return user.username == "Admin"

@router.post("/", response_model=AuthorSchema)
def create_author(
    author: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admin can create authors")
    db_author = Author(
        name=author.name,
        biography=author.biography
    )
    db.add(db_author)
    db.commit()
    db.refresh(db_author)
    return db_author

@router.get("/", response_model=List[AuthorSchema])
def read_authors(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    authors = db.query(Author).offset(skip).limit(limit).all()
    for author in authors:
        _ = author.books
    return authors

@router.get("/{author_id}", response_model=AuthorSchema)
def read_author(author_id: int, db: Session = Depends(get_db)):
    db_author = db.query(Author).filter(Author.id == author_id).first()
    if db_author is None:
        raise HTTPException(status_code=404, detail="Author not found")
    return db_author

@router.put("/{author_id}", response_model=AuthorSchema)
def update_author(
    author_id: int,
    author: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admin can update authors")
    db_author = db.query(Author).filter(Author.id == author_id).first()
    if db_author is None:
        raise HTTPException(status_code=404, detail="Author not found")
    for field, value in author.dict().items():
        setattr(db_author, field, value)
    db.commit()
    db.refresh(db_author)
    return db_author

@router.delete("/{author_id}")
def delete_author(
    author_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admin can delete authors")
    db_author = db.query(Author).filter(Author.id == author_id).first()
    if db_author is None:
        raise HTTPException(status_code=404, detail="Author not found")

    books = db_author.books[:]
    deleted_books = []
    for book in books:
        db_author.books.remove(book)
        db.commit() 
        db.refresh(book)
        if len(book.authors) == 0:
            deleted_books.append(book.title)
            db.delete(book)
            db.commit()
    db.delete(db_author)
    db.commit()
    return {"message": f"Author and orphaned books deleted successfully", "deleted_books": deleted_books}

@router.get("/search/{query}", response_model=List[AuthorSchema])
def search_authors(query: str, db: Session = Depends(get_db)):
    query = query.lower()
    print(f"Searching for authors: {query}")  
    authors = db.query(Author).filter(
        Author.name.ilike(f"%{query}%")
    ).all()
    print(f"Found {len(authors)} authors")  
    return authors 
