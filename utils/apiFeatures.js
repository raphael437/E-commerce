class APIFeatures {
  constructor(queryString) {
    this.queryString = queryString;
    this.options = {}; // Sequelize options object
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering (gte, lte, etc.)
    // Example: ?amount[gte]=50
    const where = {};
    for (let key in queryObj) {
      if (typeof queryObj[key] === 'object') {
        const operators = {};
        for (let op in queryObj[key]) {
          if (op === 'gte') operators['$gte'] = queryObj[key][op];
          if (op === 'gt') operators['$gt'] = queryObj[key][op];
          if (op === 'lte') operators['$lte'] = queryObj[key][op];
          if (op === 'lt') operators['$lt'] = queryObj[key][op];
        }
        where[key] = operators;
      } else {
        where[key] = queryObj[key];
      }
    }

    this.options.where = where;
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').map(field => {
        if (field.startsWith('-')) return [field.substring(1), 'DESC'];
        return [field, 'ASC'];
      });
      this.options.order = sortBy;
    } else {
      this.options.order = [['createdAt', 'DESC']];
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      this.options.attributes = this.queryString.fields.split(',');
    }
    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const offset = (page - 1) * limit;

    this.options.limit = limit;
    this.options.offset = offset;

    return this;
  }
}

module.exports = APIFeatures;
