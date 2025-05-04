from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Float, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

book_author = Table('book_author',
    Base.metadata,
    Column('book_id', Integer, ForeignKey('books.id')),
    Column('author_id', Integer, ForeignKey('authors.id'))
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Integer, default=1)

    ratings = relationship("UserRating", back_populates="user")

class Book(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    isbn = Column(String, unique=True, index=True)
    publication_year = Column(Integer)
    rating = Column(Float, default=0.0)
    description = Column(String)
    authors = relationship("Author", secondary=book_author, back_populates="books", lazy="joined")
    user_ratings = relationship("UserRating", back_populates="book")

class Author(Base):
    __tablename__ = "authors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    biography = Column(String)
    books = relationship("Book", secondary=book_author, back_populates="authors", lazy="joined")

class UserRating(Base):
    __tablename__ = "user_ratings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    book_id = Column(Integer, ForeignKey("books.id"))
    rating = Column(Float)
    user = relationship("User", back_populates="ratings")
    book = relationship("Book", back_populates="user_ratings")

engine = create_engine('sqlite:///./book_catalog.db')
Base.metadata.create_all(bind=engine) 