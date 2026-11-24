const { badRequest } = require('../utils/AppError');

// Runs a zod schema against req[source] and replaces it with the parsed (stripped, coerced) value.
// Unknown keys are dropped, so controllers only ever see allow-listed fields.
const validate = (schema, source = 'body') => (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
        const errors = result.error.issues.map((i) => ({
            field: i.path.join('.') || source,
            message: i.message
        }));
        throw badRequest(errors[0].message, errors);
    }
    // Express 4 lets us reassign body/params; query is replaced via a separate property
    if (source === 'query') {
        req.validatedQuery = result.data;
    } else {
        req[source] = result.data;
    }
    next();
};

module.exports = { validate };
