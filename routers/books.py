from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Book, Author, UserRating
from schemas import Book as BookSchema, BookCreate
from auth import get_current_user
from models import User
from sqlalchemy import String, func

router = APIRouter(prefix="/books", tags=["books"])

def is_admin(user):
    return user.username == "Admin"

@router.post("/", response_model=BookSchema)
def create_book(
    book: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admin can create books")
    db_book = db.query(Book).filter(Book.isbn == book.isbn).first()
    if db_book:
        raise HTTPException(status_code=400, detail="ISBN already registered")
    authors = db.query(Author).filter(Author.id.in_(book.author_ids)).all()
    if len(authors) != len(book.author_ids):
        raise HTTPException(status_code=400, detail="One or more authors not found")
    db_book = Book(
        title=book.title,
        isbn=book.isbn,
        publication_year=book.publication_year,
        description=book.description,
        authors=authors
    )
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

@router.get("/", response_model=List[BookSchema])
def read_books(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    books = db.query(Book).offset(skip).limit(limit).all()
    for book in books:
        ratings = db.query(UserRating.rating).filter(UserRating.book_id == book.id).all()
        if ratings:
            avg_rating = sum(r[0] for r in ratings) / len(ratings)
            book.rating = round(avg_rating, 2)
        else:
            book.rating = 0.0
    return books

@router.get("/{book_id}", response_model=BookSchema)
def read_book(book_id: int, db: Session = Depends(get_db)):
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return db_book

@router.put("/{book_id}", response_model=BookSchema)
def update_book(
    book_id: int,
    book: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admin can update books")
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    for field, value in book.dict(exclude={'author_ids'}).items():
        setattr(db_book, field, value)
    authors = db.query(Author).filter(Author.id.in_(book.author_ids)).all()
    if len(authors) != len(book.author_ids):
        raise HTTPException(status_code=400, detail="One or more authors not found")
    db_book.authors = authors
    db.commit()
    db.refresh(db_book)
    return db_book

@router.delete("/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only admin can delete books")
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(db_book)
    db.commit()
    return {"message": "Book deleted successfully"}

@router.get("/search/{query}", response_model=List[BookSchema])
def search_books(query: str, db: Session = Depends(get_db)):
    query = query.lower()
    print(f"Searching for: {query}")  # Debug log
    books = db.query(Book).filter(
        (func.lower(Book.title).like(f"%{query}%")) |
        (func.lower(Book.isbn).like(f"%{query}%")) |
        (func.cast(Book.publication_year, String).like(f"%{query}%"))
    ).all()
    print(f"Found {len(books)} books")  # Debug log
    for book in books:
        ratings = db.query(UserRating.rating).filter(UserRating.book_id == book.id).all()
        if ratings:
            avg_rating = sum(r[0] for r in ratings) / len(ratings)
            book.rating = round(avg_rating, 2)
        else:
            book.rating = 0.0
    return books

@router.post("/{book_id}/rate", response_model=BookSchema)
def rate_book(
    book_id: int,
    rating_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rating = rating_data.get('rating')
    if rating is None:
        raise HTTPException(status_code=422, detail="Rating is required")
    try:
        rating = float(rating)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Rating must be a number")
    if not 0 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 0 and 5")
    db_book = db.query(Book).filter(Book.id == book_id).first()
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    existing_rating = db.query(UserRating).filter(
        UserRating.user_id == current_user.id,
        UserRating.book_id == book_id
    ).first()
    if existing_rating:
        db.delete(existing_rating)
        db.flush()
    new_rating = UserRating(
        user_id=current_user.id,
        book_id=book_id,
        rating=rating
    )
    db.add(new_rating)
    ratings = db.query(UserRating.rating).filter(UserRating.book_id == book_id).all()
    if ratings:
        avg_rating = sum(r[0] for r in ratings) / len(ratings)
        db_book.rating = round(avg_rating, 2)
    else:
        db_book.rating = 0.0
    db.commit()
    db.refresh(db_book)
    return db_book 