var mongoose = require("mongoose");
var moment = require("moment");

var Schema = mongoose.Schema;

var AuthorSchema = new Schema({
  first_name: { type: String, required: true, max: 100 },
  family_name: { type: String, required: true, max: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Virtual for Author's full name
AuthorSchema.virtual("name").get(function() {
  return this.family_name + ", " + this.first_name;
});

// Virtual for Author's lifespan
AuthorSchema.virtual("lifespan").get(function() {
  if (this.date_of_death) {
    return (
      this.date_of_death.getYear() - this.date_of_birth.getYear()
    ).toString();
  } else if (this.date_of_birth) {
    const dt = new Date();
    return (dt.getYear() - this.date_of_birth.getYear()).toString();
  }
  return "Unknown";
});

// Virtual for formatted date of death
AuthorSchema.virtual("date_of_death_formatted").get(function() {
  return this.date_of_death
    ? moment(this.date_of_death).format("Do MMMM YYYY")
    : "";
});

// Virtual for formatted date of birth
AuthorSchema.virtual("date_of_birth_formatted").get(function() {
  return this.date_of_birth
    ? moment(this.date_of_birth).format("Do MMMM YYYY")
    : "Unknown";
});

AuthorSchema.virtual("date_of_birth_form").get(function() {
  return this.date_of_birth
    ? moment(this.date_of_birth).format("YYYY-MM-DD")
    : "";
});

AuthorSchema.virtual("date_of_death_form").get(function() {
  return this.date_of_death
    ? moment(this.date_of_death).format("YYYY-MM-DD")
    : "";
});

// Virtual for Author URL
AuthorSchema.virtual("url").get(function() {
  return "/catalog/author/" + this._id;
});

// Export the model
module.exports = mongoose.model("Author", AuthorSchema);
