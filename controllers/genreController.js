var Genre = require("../models/genre");
var Book = require("../models/book");
var async = require("async");
const { body, sanitizeBody, validationResult } = require("express-validator");
const debug = require("debug")("genre");

// Display list of all Genre.
exports.genre_list = function(req, res) {
  Genre.find()
    .sort([["name", "ascending"]])
    .exec(function(err, list_genres) {
      if (err) {
        debug(`list error: ${err}`);
        return next(err);
      }
      res.render("genre_list", {
        title: "Genre list",
        genre_list: list_genres,
      });
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback);
      },

      genre_books: function(callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`detail error: ${err}`);
        return next(err);
      }
      if (results.genre == null) {
        var err = new Error("Genre not found");
        err.status = 404;
        return next(err);
      }

      // successful so render response
      res.render("genre_detail", {
        title: "Genre Detail",
        genre: results.genre,
        genre_books: results.genre_books,
      });
    }
  );
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
  res.render("genre_form", { title: "Create New Genre" });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  //validate the name is not empty
  body("name", "Genre name required")
    .isLength({ min: 1 })
    .trim(),

  // Sanitise the name field
  sanitizeBody("name").escape(),

  // Process request after validation and sanitisation
  (req, res, next) => {
    // Extract validation errors from request
    const errors = validationResult(req);
    // Create a new Genre object with escaped, trimmed data
    var genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitised values/error messages
      res.render("genre_form", {
        title: "Create New Genre",
        genre: genre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data form is valid continue to check if Genre with same name exists
      Genre.findOne({ name: req.body.name }).exec(function(err, found_genre) {
        if (err) {
          debug(`list error: ${err}`);
          return next(err);
        }
        if (found_genre) {
          // Genre exists, redirect to genre detail page
          res.redirect(found_genre.url);
        } else {
          genre.save(function(err) {
            if (err) {
              return next(err);
            }
            // New genre saved, redirect to its detail page
            res.redirect(genre.url);
          });
        }
      });
    }
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      book_list: function(callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`get delete error: ${err}`);
        return next(err);
      }
      if (results.genre == null) {
        res.redirect("/catalog/genre");
      }
      res.render("genre_delete", {
        title: "Delete Genre",
        genre: results.genre,
        books: results.book_list,
      });
    }
  );
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      genre_books: function(callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`post delete error: ${err}`);
        return next(err);
      }
      if (results.genre_books.length > 0) {
        // There are still books for the selected genre
        res.render("genre_detail", {
          title: "Genre Detail",
          genre: results.genre,
          genre_books: results.genre_books,
        });
      } else {
        Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
          if (err) {
            return next(err);
          }
          res.redirect("/catalog/genres");
        });
      }
    }
  );
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
  Genre.findById(req.params.id).exec(function(err, genre) {
    if (err) {
      debug(`get update error: ${err}`);
      return next(err);
    }
    res.render("genre_form", { title: "Update Genre", genre });
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [
  body("name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Genre name must be specified"),
  sanitizeBody("name").escape(),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.render("genre_form", {
        title: "Update Genre",
        genre: req.body,
        errors: errors.array(),
      });
      return;
    } else {
      var genre = new Genre({
        name: req.body.name,
        _id: req.params.id,
      });
      Genre.findByIdAndUpdate(req.params.id, genre, {}, function(
        err,
        theGenre
      ) {
        if (err) {
          debug(`update mongodb error: ${err}`);
          return next(err);
        }
        res.redirect(genre.url);
      });
    }
  },
];
