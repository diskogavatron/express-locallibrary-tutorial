var Author = require("../models/author");
var Book = require("../models/book");
var async = require("async");
const { body, sanitizeBody, validationResult } = require("express-validator");
const debug = require("debug")("author");

// display a list of all Authors
exports.author_list = function(req, res) {
  Author.find()
    .sort([["family_name", "ascending"]])
    .exec(function(err, list_authors) {
      if (err) {
        debug(`list error: ${err}`);
        return next(err);
      }
      res.render("author_list", {
        title: "Author List",
        author_list: list_authors,
      });
    });
};

// display detail page for an author
exports.author_detail = function(req, res) {
  async.parallel(
    {
      author: function(callback) {
        Author.findById(req.params.id).exec(callback);
      },
      authors_books: function(callback) {
        Book.find({ author: req.params.id }, "title summary").exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`detail error: ${err}`);
        return next(err);
      }
      if (results == null) {
        var err = new Error("Author not found");
        err.status = 404;
        return next(err);
      }
      res.render("author_detail", {
        title: "Author Detail",
        author: results.author,
        author_books: results.authors_books,
      });
    }
  );
};

// display author create form on GET
exports.author_create_get = function(req, res, next) {
  res.render("author_form", { title: "Create New Author" });
};

// handle Author create on POST
exports.author_create_post = [
  // Validate fields
  body("first_name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("First name must be specified")
    .isAlphanumeric()
    .withMessage("First name cannot contain non-alphanumeric characters"),
  body("family_name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Family name must be specified")
    .isAlphanumeric()
    .withMessage("Family name cannot contain non-alphanumeric characters"),
  body("data_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601(),
  body("data_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Sanitise fields
  sanitizeBody("first_name").escape(),
  sanitizeBody("family_name").escape(),
  sanitizeBody("date_of_birth")
    .escape()
    .toDate(),
  sanitizeBody("date_of_death")
    .escape()
    .toDate(),

  // Process the request after validation and sanitisation
  (req, res, next) => {
    // Extract validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors so render the form again and return sanitised values/error messages
      res.render("author_form", {
        title: "Create New Author",
        author: req.body,
        errors: errors.array(),
      });
      return;
    } else {
      // Data form is valid
      var author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
      });
      author.save(function(err) {
        if (err) {
          debug(`post create error: ${err}`);
          return next(err);
        }
        res.redirect(author.url);
      });
    }
  },
];

// display Author delete form on GET
exports.author_delete_get = function(req, res, next) {
  async.parallel(
    {
      author: function(callback) {
        Author.findById(req.params.id).exec(callback);
      },
      authors_books: function(callback) {
        Book.find({ author: req.params.id }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`get delete error: ${err}`);
        return next(err);
      }
      if (results.author == null) {
        res.redirect("/catalog/authors");
      }
      res.render("author_delete", {
        title: "Delete Author",
        author: results.author,
        author_books: results.authors_books,
      });
    }
  );
};

// handle Author delete on POST
exports.author_delete_post = function(req, res, next) {
  async.parallel(
    {
      author: function(callback) {
        Author.findById(req.params.authorid).exec(callback);
      },
      authors_books: function(callback) {
        Book.find({ author: req.params.authorid }).exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`post delete error: ${err}`);
        return next(err);
      }
      // Author has books so render form with all books
      if (results.authors_books.length > 0) {
        res.render("author_delete", {
          title: "Delete Author",
          author: results.author,
          author_books: results.authors_books,
        });
        // Author has no books. Delete object and redirect to the list of authors
      } else {
        Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
          if (err) {
            return next(err);
          }
          res.redirect("/catalog/authors");
        });
      }
    }
  );
};

// display Author update form on GET
exports.author_update_get = function(req, res, next) {
  Author.findById(req.params.id).exec(function(err, author) {
    if (err) {
      debug(`get update error: ${err}`);
      return next(err);
    }
    res.render("author_form", { title: "Update Author", author });
  });
};

// handle Author update on POST
exports.author_update_post = [
  // validate fields
  body("first_name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("First name must be specified")
    .isAlphanumeric()
    .withMessage("First name cannot contain non-alphanumeric characters"),
  body("family_name")
    .isLength({ min: 1 })
    .trim()
    .withMessage("Family name must be specified")
    .isAlphanumeric()
    .withMessage("Family name cannot contain non-alphanumeric characters"),
  body("data_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601(),
  body("data_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Sanitise fields
  sanitizeBody("first_name").escape(),
  sanitizeBody("family_name").escape(),
  sanitizeBody("date_of_birth")
    .escape()
    .toDate(),
  sanitizeBody("date_of_death")
    .escape()
    .toDate(),

  // Process the request after validation and sanitisation
  (req, res, next) => {
    // Extract validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // There are errors so render the form again and return sanitised values/error messages
      res.render("author_form", {
        title: "Update Author",
        author: req.body,
        errors: errors.array(),
      });
      return;
    } else {
      // Data form is valid
      var author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        _id: req.params.id,
      });
      Author.findByIdAndUpdate(req.params.id, author, {}, function(
        err,
        theAuthor
      ) {
        if (err) {
          debug(`update mongodb error: ${err}`);
          return next(err);
        }
        res.redirect(author.url);
      });
    }
  },
];
