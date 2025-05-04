// Global variables
let currentUser = localStorage.getItem('currentUser') || null;
let token = localStorage.getItem('token') || null;
let authors = []; // Store authors for book creation
let allBooks = []; // Store all books globally

// DOM Elements
const contentDiv = document.getElementById('content');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const booksLink = document.getElementById('books-link');
const authorsLink = document.getElementById('authors-link');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Place User Management button in the main nav bar
const navBar = document.querySelector('.navbar-nav');
let userManagementBtn = document.getElementById('user-management-link');
if (!userManagementBtn) {
    userManagementBtn = document.createElement('a');
    userManagementBtn.href = '#';
    userManagementBtn.id = 'user-management-link';
    userManagementBtn.className = 'nav-link';
    userManagementBtn.textContent = 'User Management';
    navBar.appendChild(userManagementBtn);
}
userManagementBtn.style.display = 'none';

// Make Book Catalog logo inactive
const logo = document.querySelector('.navbar-brand');
if (logo) {
    logo.style.pointerEvents = 'none';
    logo.style.cursor = 'default';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadAuthorsList(); // Load authors for book creation form
    updateUI();
});

loginBtn.addEventListener('click', () => {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginForm.reset();
    loginModal.show();
});

registerBtn.addEventListener('click', () => {
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    registerForm.reset();
    registerModal.show();
});

booksLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadBooks();
    setActiveNav(booksLink);
});

authorsLink.addEventListener('click', (e) => {
    e.preventDefault();
    loadAuthors();
    setActiveNav(authorsLink);
});

userManagementBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadUserManagement();
    setActiveNav(userManagementBtn);
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data)
        });

        if (response.ok) {
            const result = await response.json();
            token = result.access_token;
            currentUser = data.username;
            localStorage.setItem('token', token);
            localStorage.setItem('currentUser', currentUser);
            updateUI();
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            loadBooks(); // Refresh the view
            setActiveNav(booksLink); // Highlight Books tab as active
        } else {
            showToast('Login failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Login failed', 'error');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
        } else {
            showToast('Registration failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Registration failed', 'error');
    }
});

// Functions
function truncateDescription(description, maxLength = 200) {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
}

function isAdmin() {
    return currentUser === 'Admin';
}

function isAuthorizedUser() {
    return !!currentUser;
}

function createBookCard(book, currentUser) {
    const userRating = book.user_ratings?.find(r => r.user_id === currentUser?.id);
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 book-card" data-id="${book.id}" style="cursor: pointer;">
                <div class="card-body">
                    <h5 class="card-title">${book.title}</h5>
                    <p class="card-text">ISBN: ${book.isbn}</p>
                    <p class="card-text">Year: ${book.publication_year}</p>
                    <p class="card-text">Authors: ${book.authors.map(a => `
                        <a href="#" class="author-link" data-id="${a.id}">${a.name}</a>
                    `).join(', ')}</p>
                    <p class="card-text">
                        Rating: <span class="rating">${'★'.repeat(Math.round(book.rating))}${'☆'.repeat(5 - Math.round(book.rating))}</span>
                        <small class="text-muted">(${book.rating.toFixed(1)} from ${book.user_ratings?.length || 0} ratings)</small>
                        ${userRating ? `<br><small class="text-primary">Your rating: ${userRating.rating}</small>` : ''}
                    </p>
                    ${isAdmin() ? `
                        <div class="btn-group">
                            <button class="btn btn-primary rate-book" data-id="${book.id}">
                                ${userRating ? 'Change Rating' : 'Rate Book'}
                            </button>
                            <button class="btn btn-info edit-book" data-id="${book.id}">Edit</button>
                            <button class="btn btn-danger delete-book" data-id="${book.id}">Delete</button>
                        </div>
                    ` : isAuthorizedUser() ? `
                        <div class="btn-group">
                            <button class="btn btn-primary rate-book" data-id="${book.id}">
                                ${userRating ? 'Change Rating' : 'Rate Book'}
                            </button>
                            <button class="btn btn-success download-book" data-id="${book.id}">Download</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function createAuthorCard(author) {
    return `
        <div class="col-md-4 mb-4">
            <div class="card h-100 author-card" data-id="${author.id}" style="cursor: pointer;">
                <div class="card-body">
                    <h5 class="card-title">${author.name}</h5>
                    <p class="card-text">${author.biography || 'No biography available'}</p>
                    <p class="card-text">
                        <small class="text-muted">Books: ${author.books?.length || 0}</small>
                    </p>
                    ${isAdmin() ? `
                        <div class="btn-group">
                            <button class="btn btn-info edit-author" data-id="${author.id}">Edit</button>
                            <button class="btn btn-danger delete-author" data-id="${author.id}">Delete</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function showBookDetails(book, currentUser) {
    const userRating = book.user_ratings?.find(r => r.user_id === currentUser?.id);
    const modalHtml = `
        <div class="modal fade" id="bookDetailsModal" tabindex="-1" aria-labelledby="bookDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="bookDetailsModalLabel">${book.title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>ISBN:</strong> ${book.isbn}</p>
                                <p><strong>Publication Year:</strong> ${book.publication_year}</p>
                                <p><strong>Authors:</strong> ${book.authors.map(a => `
                                    <a href="#" class="author-link" data-id="${a.id}">${a.name}</a>
                                `).join(', ')}</p>
                                <p>
                                    <strong>Rating:</strong> 
                                    <span class="rating">${'★'.repeat(Math.round(book.rating))}${'☆'.repeat(5 - Math.round(book.rating))}</span>
                                    <small class="text-muted">(${book.rating.toFixed(1)} from ${book.user_ratings?.length || 0} ratings)</small>
                                    ${userRating ? `<br><small class="text-primary">Your rating: ${userRating.rating}</small>` : ''}
                                </p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Description:</strong></p>
                                <p>${book.description || 'No description available'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        ${isAdmin() ? `
                            <button type="button" class="btn btn-info" id="editBookBtn" data-id="${book.id}">Edit Book</button>
                            <button type="button" class="btn btn-primary rate-book" data-id="${book.id}">
                                ${userRating ? 'Change Rating' : 'Rate Book'}
                            </button>
                        ` : isAuthorizedUser() ? `
                            <button type="button" class="btn btn-primary" id="downloadBook" data-id="${book.id}">Download Book</button>
                            <button type="button" class="btn btn-info rate-book" data-id="${book.id}">
                                ${userRating ? 'Change Rating' : 'Rate Book'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('bookDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
    modal.show();

    // Add event listeners for author links
    document.querySelectorAll('.author-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const authorId = link.dataset.id;
            modal.hide();
            // Switch to authors tab
            document.getElementById('authors-link').click();
            // Find and show the author details
            const author = authors.find(a => a.id === parseInt(authorId));
            if (author) {
                showAuthorDetails(author);
            }
        });
    });

    // Add event listeners for buttons
    document.getElementById('editBookBtn')?.addEventListener('click', () => {
        modal.hide();
        showEditBookForm(book);
    });

    document.getElementById('downloadBook')?.addEventListener('click', () => {
        alert('Download functionality will be implemented later');
    });

    document.querySelector('#bookDetailsModal .rate-book')?.addEventListener('click', () => {
        // Hide the book details modal first
        const bookDetailsModal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
        if (bookDetailsModal) bookDetailsModal.hide();

        // Open the star-based modal for this book
        currentRateBookId = book.id;
        const userRating = book.user_ratings?.find(r => r.user_id === currentUser?.id);
        const currentRating = userRating ? userRating.rating : '';
        document.getElementById('book-rating-input').value = currentRating || '';
        document.getElementById('current-rating-info').textContent = currentRating ? `Current rating: ${currentRating}` : '';
        setStarRating(currentRating || 0);
        attachStarRatingListeners();
        const rateModal = new bootstrap.Modal(document.getElementById('rateBookModal'));
        rateModal.show();
    });
}

function showAuthorDetails(author) {
    const modalHtml = `
        <div class="modal fade" id="authorDetailsModal" tabindex="-1" aria-labelledby="authorDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="authorDetailsModalLabel">${author.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Biography</h6>
                                <p>${author.biography || 'No biography available'}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Books</h6>
                                <ul class="list-group">
                                    ${author.books?.map(book => `
                                        <li class="list-group-item book-link" data-id="${book.id}">
                                            ${book.title} (${book.publication_year})
                                        </li>
                                    `).join('') || '<li class="list-group-item">No books found</li>'}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        ${isAuthorizedUser() ? `
                            <button type="button" class="btn btn-primary" id="editAuthorBtn">Edit Author</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('authorDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('authorDetailsModal'));
    modal.show();

    // Add event listeners for book links
    document.querySelectorAll('.book-link').forEach(link => {
        link.addEventListener('click', () => {
            const bookId = link.dataset.id;
            modal.hide();
            loadBooks(() => {
                // Find and show the book details after books are loaded
                const book = allBooks.find(b => b.id === parseInt(bookId));
                if (book) {
                    showBookDetails(book, currentUser);
                }
            }); // setActive defaults to true, so Books tab will be active
        });
    });

    // Add event listener for edit button
    document.getElementById('editAuthorBtn')?.addEventListener('click', () => {
        modal.hide();
        showEditAuthorForm(author);
    });
}

function showEditAuthorForm(author) {
    const formHtml = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Edit Author</h5>
                <form id="edit-author-form">
                    <div class="mb-3">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" name="name" value="${author.name}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Biography</label>
                        <textarea class="form-control" name="biography" rows="3">${author.biography || ''}</textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-secondary" id="cancel-edit-author">Cancel</button>
                </form>
            </div>
        </div>
    `;

    contentDiv.innerHTML = formHtml;

    document.getElementById('edit-author-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            biography: formData.get('biography')
        };

        try {
            const response = await fetch(`/authors/${author.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast('Author updated successfully!', 'success');
                loadAuthors();
            } else {
                showToast('Failed to update author', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to update author', 'error');
        }
    });

    document.getElementById('cancel-edit-author').addEventListener('click', () => {
        loadAuthors();
    });
}

function showEditBookForm(book) {
    const formHtml = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Edit Book</h5>
                <form id="edit-book-form">
                    <div class="mb-3">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-control" name="title" value="${book.title}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ISBN</label>
                        <input type="text" class="form-control" name="isbn" value="${book.isbn}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Publication Year</label>
                        <input type="number" class="form-control" name="publication_year" value="${book.publication_year}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" name="description" rows="3">${book.description || ''}</textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Authors</label>
                        <select class="form-select" name="author_ids" multiple required>
                            ${authors.map(author => `
                                <option value="${author.id}" ${book.authors.some(a => a.id === author.id) ? 'selected' : ''}>
                                    ${author.name}
                                </option>
                            `).join('')}
                        </select>
                        <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple authors</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-secondary" id="cancel-edit-book">Cancel</button>
                </form>
            </div>
        </div>
    `;

    contentDiv.innerHTML = formHtml;

    document.getElementById('edit-book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const authorIds = Array.from(formData.getAll('author_ids')).map(id => parseInt(id));
        
        const data = {
            title: formData.get('title'),
            isbn: formData.get('isbn'),
            publication_year: parseInt(formData.get('publication_year')),
            description: formData.get('description'),
            author_ids: authorIds
        };

        try {
            const response = await fetch(`/books/${book.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast('Book updated successfully!', 'success');
                loadBooks();
                loadAuthorsList(); // Refresh authors list after editing a book
            } else {
                showToast('Failed to update book', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to update book', 'error');
        }
    });

    document.getElementById('cancel-edit-book').addEventListener('click', () => {
        loadBooks();
    });
}

// Remove or disable the showEditBookForm function
document.querySelectorAll('.edit-book')?.forEach(btn => btn.remove());

async function loadBooks(callback, setActive = true) {
    try {
        const response = await fetch('/books/');
        allBooks = await response.json();
        console.log('Loaded books:', allBooks);  // Debug log
        
        let html = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex align-items-stretch" style="gap: 1rem;">
                        <input type="text" class="form-control flex-grow-1" id="book-search" placeholder="Search by title, ISBN, or year...">
                        ${isAdmin() ? `
                            <button class="btn btn-primary w-25" id="add-book-btn" style="height: 100%; white-space: normal;">
                                <i class="bi bi-plus-lg"></i> Add New Book
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="row" id="books-container">
                ${allBooks.map(book => createBookCard(book, currentUser)).join('')}
            </div>
        `;
        
        contentDiv.innerHTML = html;

        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-group')) return;
                
                const bookId = card.dataset.id;
                const book = allBooks.find(b => b.id === parseInt(bookId));
                if (book) {
                    showBookDetails(book, currentUser);
                }
            });
        });

        attachRateBookListeners(allBooks);

        let searchTimeout;
        document.getElementById('book-search')?.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            console.log('Search query:', query);

            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            searchTimeout = setTimeout(async () => {
                if (query.length >= 1) {
                    try {
                        console.log('Fetching search results for:', query);  // Debug log
                        const response = await fetch(`/books/search/${encodeURIComponent(query)}`);
                        if (!response.ok) {
                            throw new Error('Search failed');
                        }
                        const results = await response.json();
                        console.log('Search results:', results);  // Debug log
                        
                        const booksContainer = document.getElementById('books-container');
                        if (results.length > 0) {
                            booksContainer.innerHTML = results.map(book => createBookCard(book, currentUser)).join('');

                            document.querySelectorAll('.book-card').forEach(card => {
                                card.addEventListener('click', async (e) => {
                                    if (e.target.closest('.btn-group')) return;
                                    const bookId = card.dataset.id;
                                    const book = results.find(b => b.id === parseInt(bookId));
                                    if (book) {
                                        showBookDetails(book, currentUser);
                                    }
                                });
                            });

                            attachRateBookListeners(results);

                            document.querySelectorAll('.edit-book').forEach(button => {
                                button.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const bookId = button.dataset.id;
                                    const book = results.find(b => b.id === parseInt(bookId));
                                    if (book) {
                                        showEditBookForm(book);
                                    }
                                });
                            });

                            document.querySelectorAll('.delete-book').forEach(button => {
                                button.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const bookId = button.dataset.id;
                                    if (confirm('Are you sure you want to delete this book?')) {
                                        deleteBook(bookId);
                                    }
                                });
                            });

                            document.querySelectorAll('.download-book').forEach(button => {
                                button.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const bookId = button.dataset.id;
                                    alert('Download functionality will be implemented later');
                                });
                            });
                        } else {
                            booksContainer.innerHTML = '<div class="col-12"><p class="text-center">No books found matching your search</p></div>';
                        }
                    } catch (error) {
                        console.error('Search error:', error);
                        document.getElementById('books-container').innerHTML = '<div class="col-12"><p class="text-center text-danger">Error performing search</p></div>';
                    }
                } else if (query.length === 0) {
                    const booksContainer = document.getElementById('books-container');
                    booksContainer.innerHTML = allBooks.map(book => createBookCard(book, currentUser)).join('');

                    document.querySelectorAll('.book-card').forEach(card => {
                        card.addEventListener('click', async (e) => {
                            if (e.target.closest('.btn-group')) return;
                            const bookId = card.dataset.id;
                            const book = allBooks.find(b => b.id === parseInt(bookId));
                            if (book) {
                                showBookDetails(book, currentUser);
                            }
                        });
                    });
                }
            }, 100);
        });

        document.querySelectorAll('.delete-book').forEach(button => {
            button.addEventListener('click', () => {
                const bookId = button.dataset.id;
                if (confirm('Are you sure you want to delete this book?')) {
                    deleteBook(bookId);
                }
            });
        });

        document.getElementById('add-book-btn')?.addEventListener('click', () => {
            showAddBookForm();
        });

        document.querySelectorAll('.edit-book').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const bookId = button.dataset.id;
                const book = allBooks.find(b => b.id === parseInt(bookId));
                if (book) {
                    showEditBookForm(book);
                }
            });
        });

        if (setActive) setActiveNav(booksLink);
        if (callback) callback();
    } catch (error) {
        console.error('Error:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Error loading books</div>';
    }
}

async function loadAuthors() {
    try {
        const response = await fetch('/authors/');
        authors = await response.json();
        console.log('Loaded authors:', authors);
        
        let html = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex align-items-stretch" style="gap: 1rem;">
                        <input type="text" class="form-control flex-grow-1" id="author-search" placeholder="Search by author name...">
                        ${isAdmin() ? `
                            <button class="btn btn-primary w-25" id="add-author-btn" style="height: 100%; white-space: normal;">
                                <i class="bi bi-plus-lg"></i> Add New Author
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            <div class="row" id="authors-container">
                ${authors.map(author => createAuthorCard(author)).join('')}
            </div>
        `;
        
        contentDiv.innerHTML = html;

        document.querySelectorAll('.author-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                if (e.target.closest('.btn-group')) return;
                
                const authorId = card.dataset.id;
                const author = authors.find(a => a.id === parseInt(authorId));
                if (author) {
                    showAuthorDetails(author);
                }
            });
        });

        document.querySelectorAll('.edit-author').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const authorId = button.dataset.id;
                const author = authors.find(a => a.id === parseInt(authorId));
                if (author) {
                    showEditAuthorForm(author);
                }
            });
        });
        
        document.querySelectorAll('.delete-author').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const authorId = button.dataset.id;
                const confirmed = await showConfirm('Are you sure you want to delete this author?', 'Delete Author');
                if (confirmed) {
                    deleteAuthor(authorId);
                }
            });
        });

        let searchTimeout;
        document.getElementById('author-search')?.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            console.log('Searching for authors:', query);  // Debug log
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            searchTimeout = setTimeout(async () => {
                if (query.length >= 1) {
                    try {
                        const response = await fetch(`/authors/search/${encodeURIComponent(query)}`);
                        if (!response.ok) {
                            throw new Error('Search failed');
                        }
                        const results = await response.json();
                        console.log('Search results:', results);  // Debug log
                        
                        const authorsContainer = document.getElementById('authors-container');
                        if (results.length > 0) {
                            authorsContainer.innerHTML = results.map(author => createAuthorCard(author)).join('');

                            document.querySelectorAll('.author-card').forEach(card => {
                                card.addEventListener('click', async (e) => {
                                    if (e.target.closest('.btn-group')) return;
                                    const authorId = card.dataset.id;
                                    const author = results.find(a => a.id === parseInt(authorId));
                                    if (author) {
                                        showAuthorDetails(author);
                                    }
                                });
                            });

                            document.querySelectorAll('.edit-author').forEach(button => {
                                button.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const authorId = button.dataset.id;
                                    const author = results.find(a => a.id === parseInt(authorId));
                                    if (author) {
                                        showEditAuthorForm(author);
                                    }
                                });
                            });

                            document.querySelectorAll('.delete-author').forEach(button => {
                                button.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const authorId = button.dataset.id;
                                    deleteAuthor(authorId);
                                });
                            });
                        } else {
                            authorsContainer.innerHTML = '<div class="col-12"><p class="text-center">No authors found matching your search</p></div>';
                        }
                    } catch (error) {
                        console.error('Search error:', error);
                        document.getElementById('authors-container').innerHTML = '<div class="col-12"><p class="text-center text-danger">Error performing search</p></div>';
                    }
                } else if (query.length === 0) {
                    const authorsContainer = document.getElementById('authors-container');
                    authorsContainer.innerHTML = authors.map(author => createAuthorCard(author)).join('');
                    
                    document.querySelectorAll('.author-card').forEach(card => {
                        card.addEventListener('click', async (e) => {
                            if (e.target.closest('.btn-group')) return;
                            const authorId = card.dataset.id;
                            const author = authors.find(a => a.id === parseInt(authorId));
                            if (author) {
                                showAuthorDetails(author);
                            }
                        });
                    });
                }
            }, 100);
        });
        
        document.getElementById('add-author-btn')?.addEventListener('click', () => {
            showAddAuthorForm();
        });
    } catch (error) {
        console.error('Error:', error);
        contentDiv.innerHTML = '<div class="alert alert-danger">Error loading authors</div>';
    }
}

async function loadAuthorsList() {
    try {
        const response = await fetch('/authors/');
        authors = await response.json();
    } catch (error) {
        console.error('Error loading authors list:', error);
    }
}

function showAddAuthorForm() {
    const formHtml = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Add New Author</h5>
                <form id="new-author-form">
                    <div class="mb-3">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Biography</label>
                        <textarea class="form-control" name="biography" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Author</button>
                    <button type="button" class="btn btn-secondary" id="cancel-author">Cancel</button>
                </form>
            </div>
        </div>
    `;

    contentDiv.innerHTML = formHtml;

    document.getElementById('new-author-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            biography: formData.get('biography')
        };

        try {
            const response = await fetch('/authors/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast('Author added successfully!', 'success');
                loadAuthors();
                loadAuthorsList();
            } else {
                showToast('Failed to add author', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to add author', 'error');
        }
    });

    document.getElementById('cancel-author').addEventListener('click', () => {
        loadAuthors();
    });
}

function showAddBookForm() {
    const formHtml = `
        <div class="card">
            <div class="card-body">
                <h5 class="card-title">Add New Book</h5>
                <form id="new-book-form">
                    <div class="mb-3">
                        <label class="form-label">Title</label>
                        <input type="text" class="form-control" name="title" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">ISBN</label>
                        <input type="text" class="form-control" name="isbn" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Publication Year</label>
                        <input type="number" class="form-control" name="publication_year" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" name="description" rows="3"></textarea>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Authors</label>
                        <select class="form-select" name="author_ids" multiple required>
                            ${authors.map(author => `
                                <option value="${author.id}">${author.name}</option>
                            `).join('')}
                        </select>
                        <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple authors</small>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Book</button>
                    <button type="button" class="btn btn-secondary" id="cancel-book">Cancel</button>
                </form>
            </div>
        </div>
    `;

    contentDiv.innerHTML = formHtml;

    document.getElementById('new-book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const authorIds = Array.from(formData.getAll('author_ids')).map(id => parseInt(id));
        
        const data = {
            title: formData.get('title'),
            isbn: formData.get('isbn'),
            publication_year: parseInt(formData.get('publication_year')),
            description: formData.get('description'),
            author_ids: authorIds
        };

        try {
            const response = await fetch('/books/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast('Book added successfully!', 'success');
                loadBooks();
                loadAuthorsList();
            } else {
                showToast('Failed to add book', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to add book', 'error');
        }
    });

    document.getElementById('cancel-book').addEventListener('click', () => {
        loadBooks();
    });
}

async function deleteBook(bookId) {
    try {
        const response = await fetch(`/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showToast('Book deleted successfully!', 'success');
            loadBooks();
        } else {
            showToast('Failed to delete book', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to delete book', 'error');
    }
}

async function deleteAuthor(authorId) {
    try {
        const response = await fetch(`/authors/${authorId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            showToast('Author deleted successfully!', 'success');
            if (result.deleted_books && result.deleted_books.length > 0) {
                result.deleted_books.forEach(title => {
                    showPopup(`Book "${title}" deleted because it had no authors left.`, 'Book Deleted');
                });
            }
            loadAuthors();
            loadAuthorsList();
            setActiveNav(authorsLink);
        } else {
            showToast('Failed to delete author', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to delete author', 'error');
    }
}

async function rateBook(bookId, rating) {
    try {
        const response = await fetch(`/books/${bookId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rating: parseFloat(rating) })
        });

        if (response.ok) {
            const updatedBook = await response.json();
            loadBooks();
        } else {
            const errorData = await response.json();
            if (errorData.detail) {
                showToast(`Failed to rate book: ${errorData.detail}`, 'error');
            } else {
                showToast('Failed to rate book: Unknown error occurred', 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to rate book: Network error occurred', 'error');
    }
}

function updateUI() {
    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-light';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', () => {
            currentUser = null;
            token = null;
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            updateUI();
            loadBooks();
        });
        document.querySelector('.d-flex').appendChild(logoutBtn);
        userManagementBtn.style.display = isAdmin() ? 'inline-block' : 'none';
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
        const logoutBtn = document.querySelector('.btn-outline-light:last-child');
        if (logoutBtn) {
            logoutBtn.remove();
        }
        userManagementBtn.style.display = 'none';
    }
}

async function loadUserManagement() {
    try {
        const response = await fetch('/auth/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to load users');
        const users = await response.json();
        let html = `<div class="row"><div class="col-12"><h3>User Management</h3><table class="table"><thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Active</th><th>Actions</th></tr></thead><tbody>`;
        users.forEach(user => {
            html += `<tr><td>${user.id}</td><td>${user.username}</td><td>${user.email}</td><td>${user.is_active ? 'Yes' : 'No'}</td><td><button class="btn btn-danger delete-user" data-id="${user.id}">Delete</button></td></tr>`;
        });
        html += `</tbody></table></div></div>`;
        contentDiv.innerHTML = html;
        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this user?')) {
                    const userId = btn.dataset.id;
                    const delResp = await fetch(`/auth/users/${userId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (delResp.ok) {
                        showToast('User deleted', 'success');
                        loadUserManagement();
                    } else {
                        showToast('Failed to delete user', 'error');
                    }
                }
            });
        });
    } catch (error) {
        contentDiv.innerHTML = '<div class="alert alert-danger">Error loading users</div>';
    }
}

function setActiveNav(activeBtn) {
    document.querySelectorAll('.navbar-nav .nav-link').forEach(btn => btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

// Add Bootstrap Toast container if not present
if (!document.getElementById('toast-container')) {
    const toastDiv = document.createElement('div');
    toastDiv.id = 'toast-container';
    toastDiv.className = 'position-fixed top-0 end-0 p-3';
    toastDiv.style.zIndex = '1100';
    document.body.appendChild(toastDiv);
}

function showToast(message, type = 'info') {
    const toastId = `toast-${Date.now()}`;
    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';
    const html = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    const container = document.getElementById('toast-container');
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

if (!document.getElementById('rateBookModal')) {
    const modalHtml = `
        <div class="modal fade" id="rateBookModal" tabindex="-1" aria-labelledby="rateBookModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="rateBookModalLabel">Rate Book</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="rate-book-form">
                            <div class="mb-3 text-center">
                                <label class="form-label d-block mb-2">Click a star to rate:</label>
                                <div id="star-rating" style="font-size: 2rem; cursor: pointer;">
                                    <span class="star" data-value="1">☆</span>
                                    <span class="star" data-value="2">☆</span>
                                    <span class="star" data-value="3">☆</span>
                                    <span class="star" data-value="4">☆</span>
                                    <span class="star" data-value="5">☆</span>
                                </div>
                                <input type="hidden" id="book-rating-input" required>
                                <div id="current-rating-info" class="form-text"></div>
                            </div>
                            <button type="submit" class="btn btn-primary">Submit</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function setStarRating(rating) {
    const stars = document.querySelectorAll('#star-rating .star');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        star.textContent = val <= rating ? '★' : '☆';
    });
}

function attachStarRatingListeners() {
    const stars = document.querySelectorAll('#star-rating .star');
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            setStarRating(parseInt(star.getAttribute('data-value')));
        });
        star.addEventListener('mouseleave', () => {
            const current = parseInt(document.getElementById('book-rating-input').value) || 0;
            setStarRating(current);
        });
        star.addEventListener('click', () => {
            const val = parseInt(star.getAttribute('data-value'));
            document.getElementById('book-rating-input').value = val;
            setStarRating(val);
        });
    });
}

let currentRateBookId = null;
let currentRateBookCurrentRating = null;

function attachRateBookListeners(bookList) {
    document.querySelectorAll('.rate-book').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookId = button.dataset.id;
            const book = bookList.find(b => b.id === parseInt(bookId));
            const userRating = book?.user_ratings?.find(r => r.user_id === currentUser?.id);
            const currentRating = userRating ? userRating.rating : '';
            currentRateBookId = bookId;
            currentRateBookCurrentRating = currentRating;
            document.getElementById('book-rating-input').value = currentRating || '';
            document.getElementById('current-rating-info').textContent = currentRating ? `Current rating: ${currentRating}` : '';
            setStarRating(currentRating || 0);
            attachStarRatingListeners();
            const modal = new bootstrap.Modal(document.getElementById('rateBookModal'));
            modal.show();
        });
    });
}

if (!window._rateBookModalFormAttached) {
    document.getElementById('rate-book-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const rating = parseInt(document.getElementById('book-rating-input').value);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
            rateBook(currentRateBookId, rating);
            bootstrap.Modal.getInstance(document.getElementById('rateBookModal')).hide();
        } else {
            alert('Please click a star to select a rating between 1 and 5');
        }
    });
    window._rateBookModalFormAttached = true;
}

if (!document.getElementById('infoModal')) {
    const modalHtml = `
        <div class="modal fade" id="infoModal" tabindex="-1" aria-labelledby="infoModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="infoModalLabel">Notification</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="infoModalBody">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showPopup(message, title = 'Notification') {
    document.getElementById('infoModalLabel').textContent = title;
    document.getElementById('infoModalBody').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('infoModal'));
    modal.show();
}

if (!document.getElementById('confirmModal')) {
    const modalHtml = `
        <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="confirmModalLabel">Confirm Action</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="confirmModalBody">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="confirmCancelBtn" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmOkBtn">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showConfirm(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        document.getElementById('confirmModalLabel').textContent = title;
        document.getElementById('confirmModalBody').textContent = message;
        const modalEl = document.getElementById('confirmModal');
        const modal = new bootstrap.Modal(modalEl);
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        function cleanup(result) {
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            modalEl.removeEventListener('hidden.bs.modal', onCancel);
            resolve(result);
        }
        function onOk() {
            modal.hide();
            cleanup(true);
        }
        function onCancel() {
            cleanup(false);
        }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        modalEl.addEventListener('hidden.bs.modal', onCancel);
        modal.show();
    });
} 