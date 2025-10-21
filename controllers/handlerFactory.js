const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

// ---------------- GET ALL ----------------
exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    const features = new APIFeatures(req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const allDocs = await Model.findAll(features.options);

    if (!allDocs || allDocs.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No data found',
      });
    }

    res.status(200).json({
      status: 'success',
      results: allDocs.length,
      data: allDocs,
    });
  });

// ---------------- GET ONE ----------------
exports.getOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findOne({ where: { id: req.params.id } });

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No document found with that ID',
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

// ---------------- UPDATE ONE ----------------
exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    // First check if the document exists
    const doc = await Model.findOne({ where: { id: req.params.id } });

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No document found with that ID',
      });
    }

    // Then perform the update
    await Model.update(req.body, {
      where: { id: req.params.id },
    });

    // Fetch the updated document
    const updatedDoc = await Model.findOne({ where: { id: req.params.id } });

    res.status(200).json({
      status: 'success',
      data: updatedDoc,
    });
  });
// ---------------- DELETE ONE ----------------
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findOne({ where: { id: req.params.id } });

    if (!doc) {
      return res.status(404).json({
        status: 'fail',
        message: 'No document found with that ID',
      });
    }

    await doc.destroy();

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

// ---------------- DELETE ALL ----------------
exports.deleteAll = Model =>
  catchAsync(async (req, res, next) => {
    const count = await Model.destroy({
      where: {},
      truncate: false,
      cascade: true, 
    });

    res.status(200).json({
      status: 'success',
      deletedCount: count,
    });
  });

