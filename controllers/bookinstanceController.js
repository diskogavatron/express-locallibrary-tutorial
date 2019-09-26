var BookInstance = require("../models/bookinstance");
const { body, sanitizeBody, validationResult } = require("express-validator");
var Book = require("../models/book");
const async = require("async");
const debug = require("debug")("book_instance");

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
  BookInstance.find()
    .populate("book")
    .exec(function(err, list_bookinstances) {
      if (err) {
        debug(`list error: ${err}`);
        return next(err);
      }
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec(function(err, bookinstance) {
      if (err) {
        debug(`detail error: ${err}`);
        return next(err);
      }
      if (bookinstance == null) {
        var err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      res.render("bookinstance_detail", {
        title: "Copy: " + bookinstance.book.title,
        bookinstance: bookinstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
  Book.find({}, "title").exec(function(err, books) {
    res.render("bookInstance_form", {
      title: "Create New BookInstance",
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate fields.
  body("book", "Book must be specified")
    .isLength({ min: 1 })
    .trim(),
  body("imprint", "Imprint must be specified")
    .isLength({ min: 1 })
    .trim(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Sanitize fields.
  sanitizeBody("book").escape(),
  sanitizeBody("imprint").escape(),
  sanitizeBody("status")
    .trim()
    .escape(),
  sanitizeBody("due_back").toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    var bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec(function(err, books) {
        if (err) {
          debug(`get create error: ${err}`);
          return next(err);
        }
        // Successful, so render.
        res.render("bookinstance_form", {
          title: "Create New BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      // Date is null. Mongoose won't set default unless undefined
      if (bookinstance.due_back === null) {
        bookinstance.due_back = undefined;
      }
      // Data from form is valid.
      bookinstance.save(function(err) {
        if (err) {
          debug(`create mongodb error: ${err}`);
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
  BookInstance.findById(req.params.id).exec(function(err, bookinstance) {
    if (err) {
      debug(`get delete error: ${err}`);
      return next(err);
    }
    res.render("bookinstance_delete", {
      title: "Delete bookinstance",
      bookinstance: bookinstance,
    });
  });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
  console.log(req.body);
  BookInstance.findByIdAndRemove(
    req.body.bookinstanceid,
    function deleteBookinstance(err) {
      if (err) {
        debug(`delete mongodb error: ${err}`);
        return next(err);
      }
      res.redirect("/catalog/bookinstances");
    }
  );
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
  async.parallel(
    {
      bookinstance: function(callback) {
        BookInstance.findById(req.params.id)
          .populate("book")
          .exec(callback);
      },
      book_list: function(callback) {
        Book.find().exec(callback);
      },
    },
    function(err, results) {
      if (err) {
        debug(`get update error: ${err}`);
        return next(err);
      }
      res.render("bookinstance_form", {
        title: "Update",
        bookinstance: results.bookinstance,
        book_list: results.book_list,
      });
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate fields.
  body("book", "Book must be specified")
    .isLength({ min: 1 })
    .trim(),
  body("imprint", "Imprint must be specified")
    .isLength({ min: 1 })
    .trim(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601(),

  // Sanitize fields.
  sanitizeBody("book").escape(),
  sanitizeBody("imprint").escape(),
  sanitizeBody("status")
    .trim()
    .escape(),
  sanitizeBody("due_back").toDate(),

  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a bookinstance object with validated data and old id
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.body.id,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec(function(err, books) {
        if (err) {
          debug(`book find mongodb error: ${err}`);
          return next(err);
        }
        // Successful, so render.
        res.render("bookinstance_form", {
          title: "Update BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance: bookinstance,
        });
      });
      return;
    } else {
      // Date is null. Mongoose won't set default unless undefined
      if (bookinstance.due_back === null) {
        bookinstance.due_back = undefined;
      }
      // Form data is valid.
      bookinstance.save(function(err) {
        if (err) {
          debug(`update mongodb error: ${err}`);
          return next(err);
        }
        // Successful - redirect to updated record.
        res.redirect(bookinstance.url);
      });
    }
  },
];
