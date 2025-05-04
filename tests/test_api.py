import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def get_token(username="Admin", password="testpassword", email="admin@example.com"):
    # Try to register the user
    response = client.post("/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    # If already registered, ignore error
    if response.status_code not in (200, 201, 400):
        assert False, f"Unexpected status code: {response.status_code} - {response.text}"

    # Login with the user
    response = client.post("/auth/token", data={
        "username": username,
        "password": password
    })
    assert response.status_code == 200
    token = response.json().get("access_token")
    assert token
    return token

def test_register_and_login():
    token = get_token()
    assert token

def test_duplicate_registration_fails():
    # Register once
    response = client.post("/auth/register", json={
        "username": "dupeuser",
        "email": "dupeuser@example.com",
        "password": "testpassword"
    })
    assert response.status_code in (200, 201)
    # Register again with same username
    response = client.post("/auth/register", json={
        "username": "dupeuser",
        "email": "dupeuser2@example.com",
        "password": "testpassword"
    })
    assert response.status_code == 400

def test_login_wrong_password_fails():
    # Register user
    client.post("/auth/register", json={
        "username": "wrongpass",
        "email": "wrongpass@example.com",
        "password": "rightpassword"
    })
    # Try wrong password
    response = client.post("/auth/token", data={
        "username": "wrongpass",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_create_author_and_book():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create an author (use "biography" field)
    response = client.post("/authors/", json={
        "name": "Test Author",
        "biography": "A test author."
    }, headers=headers)
    assert response.status_code in (200, 201)
    author_id = response.json()["id"]

    # Create a book (use correct fields)
    response = client.post("/books/", json={
        "title": "Test Book",
        "isbn": "1234567890",
        "publication_year": 2024,
        "description": "A test book.",
        "author_ids": [author_id]
    }, headers=headers)
    assert response.status_code in (200, 201)
    book_id = response.json()["id"]

    # Get the book
    response = client.get(f"/books/{book_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Test Book"

    # Update the book (use correct fields)
    response = client.put(f"/books/{book_id}", json={
        "title": "Updated Test Book",
        "isbn": "1234567890",
        "publication_year": 2024,
        "description": "Updated description.",
        "author_ids": [author_id]
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Test Book"

    # Rate the book
    response = client.post(f"/books/{book_id}/rate", json={"rating": 5}, headers=headers)
    assert response.status_code == 200

    # Search for the book
    response = client.get("/books/search/Updated")
    assert response.status_code == 200
    assert any(book["id"] == book_id for book in response.json())

    # Delete the book
    response = client.delete(f"/books/{book_id}", headers=headers)
    assert response.status_code == 200

    # Delete the author
    response = client.delete(f"/authors/{author_id}", headers=headers)
    assert response.status_code == 200

def test_create_author_fails_for_non_admin():
    # Register a non-admin user
    username = "notadmin"
    password = "testpassword"
    email = "notadmin@example.com"
    get_token(username, password, email)
    response = client.post("/auth/token", data={
        "username": username,
        "password": password
    })
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Try to create an author
    response = client.post("/authors/", json={
        "name": "Should Fail",
        "biography": "Not admin"
    }, headers=headers)
    assert response.status_code == 403

def test_create_book_fails_for_non_admin():
    # Register a non-admin user
    username = "notadmin2"
    password = "testpassword"
    email = "notadmin2@example.com"
    get_token(username, password, email)
    response = client.post("/auth/token", data={
        "username": username,
        "password": password
    })
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Try to create a book
    response = client.post("/books/", json={
        "title": "Should Fail",
        "isbn": "0000000000",
        "publication_year": 2024,
        "description": "Not admin",
        "author_ids": [1]
    }, headers=headers)
    assert response.status_code == 403

def test_create_book_fails_with_missing_fields():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    # Missing isbn, publication_year, author_ids
    response = client.post("/books/", json={
        "title": "Incomplete Book"
    }, headers=headers)
    assert response.status_code == 422

def test_author_not_found():
    response = client.get("/authors/999999")
    assert response.status_code == 404

def test_book_not_found():
    response = client.get("/books/999999")
    assert response.status_code == 404

def test_rating_out_of_bounds():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    # Create an author
    response = client.post("/authors/", json={
        "name": "Rate Author",
        "biography": "For rating test"
    }, headers=headers)
    author_id = response.json()["id"]
    # Create a book
    response = client.post("/books/", json={
        "title": "Rate Book",
        "isbn": "9999999999",
        "publication_year": 2024,
        "description": "For rating test",
        "author_ids": [author_id]
    }, headers=headers)
    book_id = response.json()["id"]
    # Try to rate out of bounds
    response = client.post(f"/books/{book_id}/rate", json={"rating": 6}, headers=headers)
    assert response.status_code == 400
    response = client.post(f"/books/{book_id}/rate", json={"rating": -1}, headers=headers)
    assert response.status_code == 400
    # Clean up
    client.delete(f"/books/{book_id}", headers=headers)
    client.delete(f"/authors/{author_id}", headers=headers)

def test_delete_nonexistent_author_and_book():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.delete("/authors/999999", headers=headers)
    assert response.status_code == 404
    response = client.delete("/books/999999", headers=headers)
    assert response.status_code == 404

def test_get_all_books_and_authors():
    response = client.get("/books/")
    assert response.status_code == 200
    response = client.get("/authors/")
    assert response.status_code == 200