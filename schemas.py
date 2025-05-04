from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class AuthorBase(BaseModel):
    name: str
    biography: Optional[str] = None

class AuthorSummary(AuthorBase):
    id: int
    class Config:
        from_attributes = True

class AuthorCreate(AuthorBase):
    pass

class Author(AuthorBase):
    id: int
    books: List[BookSummary] = []

    class Config:
        from_attributes = True

class BookBase(BaseModel):
    title: str
    isbn: str
    publication_year: int
    description: Optional[str] = None

class BookSummary(BookBase):
    id: int
    rating: float
    class Config:
        from_attributes = True

class BookCreate(BookBase):
    author_ids: List[int]

class UserRatingBase(BaseModel):
    rating: float

class UserRatingCreate(UserRatingBase):
    pass

class UserRating(UserRatingBase):
    id: int
    user_id: int
    book_id: int

    class Config:
        from_attributes = True

class Book(BookBase):
    id: int
    rating: float
    authors: List[AuthorSummary]
    user_ratings: List["UserRating"]

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None 