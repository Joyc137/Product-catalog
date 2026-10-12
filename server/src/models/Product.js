import mongoose from 'mongoose';
import { CATEGORIES } from '../constants/categories.js';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, required: true, enum: CATEGORIES },
    price: { type: Number, required: true, min: 0, max: 1_000_000 },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    imageUrl: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

/*
 * Index strategy (see README "Indexes" for the full reasoning):
 *
 * Every list query is "optional category equality filter" + "one sort key".
 * Following the ESR rule (Equality, Sort, Range) each sortable field gets:
 *   - a { field, _id } index for the unfiltered catalog, and
 *   - a { category, field, _id } index for the category-filtered catalog.
 * _id is the tiebreaker so pagination is stable (no duplicates/skips between
 * pages when many products share a price) and the sort is fully index-covered,
 * i.e. MongoDB walks the index in order and stops after skip+limit documents
 * instead of loading and sorting every match in memory.
 */
productSchema.index({ createdAt: -1, _id: -1 });
productSchema.index({ price: 1, _id: 1 });
productSchema.index({ name: 1, _id: 1 });
productSchema.index({ category: 1, createdAt: -1, _id: -1 });
productSchema.index({ category: 1, price: 1, _id: 1 });
productSchema.index({ category: 1, name: 1, _id: 1 });

// Full-text search over name (weighted higher) and description.
productSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 2 }, name: 'product_text_search' },
);

export const Product = mongoose.model('Product', productSchema);
