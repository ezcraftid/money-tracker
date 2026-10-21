class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('; '));
    this.errors = errors;   // array of Indonesian messages
    this.status = 400;
    this.expose = true;
  }
}
module.exports = { ValidationError };
