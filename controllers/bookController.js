var Book = require("../models/book");
var Author = require("../models/author");
var Genre = require("../models/genre");
var BookInstance = require("../models/bookinstance");
var async = require("async");
var { body, sanitizeBody, validationResult } = require("express-validator");
const debug = require("debug")("book");

exports.index = function(req, res) {
  async.parallel(
    {
      book_count: function(callback) {
        // Pass empty object as match condition to find all documents in the collection
        Book.countDocuments({}, callback);
      },
      book_instance_count: function(callback) {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count: function(callback) {
        BookInstance.countDocuments({ status: "Available" }, callback);
      },
      author_count: function(callback) {
        Author.countDocuments({}, callback);
      },
      genre_count: function(callback) {
        Genre.countDocuments({}, callback);
      },
    },
    function(err, results) {
      res.render("index", {
        title: "Local Library Home",
        error: err,
        data: results,
      });
    }
  );
};

// Display list of all books.
exports.book_list = function(req, res, next) {
  Book.find({}, "title author")
    .populate("author")
    .exec(function(err, list_books) {
      if (err) {
        debug(`list error: ${err}`);
        return next(err);
      }
      res.render("book_list", { title: "Book List", book_list: list_books });
    });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .populate("author")
          .populate("genre")
          .exec(callback);
      },
      book_instances: function(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`detail error: ${err}`);
        return next(err);
      }
      if (results.book == null) {
        var err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      res.render("book_detail", {
        title: results.book.title,
        book: results.book,
        book_instances: results.book_instances,
      });
    }
  );
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
  // Get all authors and genres
  async.parallel(
    {
      authors: function(callback) {
        Author.find(callback);
      },
      genres: function(callback) {
        Genre.find(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`get create error: ${err}`);
        return next(err);
      }
      res.render("book_form", {
        title: "Create New Book",
        authors: results.authors,
        genres: results.genres,
      });
    }
  );
};

// Handle book create on POST.
exports.book_create_post = [
  // Validate body of request
  (req, res, next) => {
    // convert the genre to an array
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // Validate fields
  body("title", "Title must not be empty")
    .isLength({ min: 1 })
    .trim(),
  body("author", "Author must not be empty")
    .isLength({ min: 1 })
    .trim(),
  body("summary", "Summary must not be empty")
    .isLength({ min: 1 })
    .trim(),
  body("isbn", "ISBN must not be empty")
    .isLength({ min: 1 })
    .trim(),

  // Sanitise all fields using a wildcard
  sanitizeBody("*").escape(),
  sanitizeBody("genre.*").escape(),

  // Process request after validation and sanitisation
  (req, res, next) => {
    // Extract the validation errors from the request
    const errors = validationResult(req);
    // Create a Book object using the validated data
    var book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!errors.isEmpty()) {
      // There are errors so render form with sanitised data back to user
      async.parallel({
        authors: function(callback) {
          Author.find(callback);
        },
        genres: function(callback) {
          Genre.find(callback);
        },
        function(err, results) {
          if (err) {
            debug(`post create error: ${err}`);
            return next(err);
          }
          // Mark user selected generes as checked
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              // current genre is selected so set 'checked' property
              results.genres[i].checked = "true";
            }
          }
          res.render("book_form", {
            title: "Create New Book",
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array(),
          });
        },
      });
      return;
    } else {
      // Data is valid, save the book
      book.save(function(err) {
        if (err) {
          debug(`save mongodb error: ${err}`);
          return next(err);
        }
        res.redirect(book.url);
      });
    }
  },
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id).exec(callback);
      },
      bookinstances: function(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`get delete error: ${err}`);
        return next(err);
      }
      if (results.book == null) {
        res.redirect("/catalog/books");
      }
      res.render("book_delete", {
        title: "Delete Book",
        book: results.book,
        bookinstances: results.bookinstances,
      });
    }
  );
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id).exec(callback);
      },
      bookinstances: function(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`post delete error: ${err}`);
        return next(err);
      }
      if (results.bookinstances.length > 0) {
        // There are still instances so render the book detail page
        res.render("book_detail", {
          title: results.book.title,
          book: results.book,
          book_instances: results.book_instances,
        });
      } else {
        Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
          if (err) {
            debug(`post delete mongodb error: ${err}`);
            return next(err);
          }
          res.redirect("/catalog/books");
        });
      }
    }
  );
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
  // GET book, authors and genres for the form
  async.parallel(
    {
      book: function(callback) {
        Book.findById(req.params.id)
          .populate("author")
          .populate("genre")
          .exec(callback);
      },
      authors: function(callback) {
        Author.find(callback);
      },
      genres: function(callback) {
        Genre.find(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`get update error: ${err}`);
        return next(err);
      }
      if (results.book == null) {
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Mark selected genres as checked
      for (
        let all_g_iter = 0;
        all_g_iter < results.genres.length;
        all_g_iter++
      ) {
        for (
          let book_g_iter = 0;
          book_g_iter < results.book.genre.length;
          book_g_iter++
        ) {
          if (
            results.genres[all_g_iter]._id.toString() ==
            results.book.genre[book_g_iter]._id.toString()
          ) {
            results.genres[all_g_iter].checked = "true";
          }
        }
      }
      res.render("book_form", {
        title: "Update Book",
        authors: results.authors,
        genres: results.genres,
        book: results.book,
      });
    }
  );
};

// Handle book update on POST.
exports.book_update_post = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === "undefined") {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // Validate form
  body("title", "Title must not be empty")
    .isLength({ min: 1 })
    .trim(),
  body("author", "Author must not be empty")
    .isLength({ min: 1 })
    .trim(),
  body("summary", "Summary must not be empty")
    .isLength({ min: 1 })
    .trim(),
  body("isbn", "ISBN must not be empty")
    .isLength({ min: 1 })
    .trim(),

  // Sanitise form values
  sanitizeBody("title").escape(),
  sanitizeBody("author").escape(),
  sanitizeBody("summary").escape(),
  sanitizeBody("isbn").escape(),
  sanitizeBody("genre.*").escape(),

  // Process request
  (req, res, next) => {
    // Extract errors if any
    const errors = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, // This is required else a new id will be assigned
    });

    if (!errors.isEmpty()) {
      // There are errors, render the form with data and messages
      async.parallel(
        {
          authors: function(callback) {
            Author.find(callback);
          },
          genres: function(callback) {
            Genre.find(callback);
          },
        },
        function(err, results) {
          if (err) {
            debug(`post update error: ${err}`);
            return next(err);
          }

          // Mark selected genres as checked
          for (let i = 0; i < results.genres.length; i++) {
            // indexOf returns -1 if the value to search for never occurs
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genre[i].checked = "true";
            }
          }
          res.render("book_form", {
            title: "Update Book",
            authors: results.authors,
            genres: results.genres,
            book: book,
            errors: errors.array(),
          });
        }
      );
      return;
    } else {
      // Data is valid, update the database
      Book.findByIdAndUpdate(req.params.id, book, {}, function(err, thebook) {
        if (err) {
          debug(`update mongodb error: ${err}`);
          return next(err);
        }
        res.redirect(book.url);
      });
    }
  },
];
