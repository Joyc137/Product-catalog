import Joi from 'joi';
import { FilterXSS } from 'xss';

// Strips every HTML tag (and the contents of <script>/<style>) from user text.
// React already escapes output, but stored XSS should be stopped at the door so
// that no other consumer of this API can be hit by it either.
const stripper = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  escapeHtml: (html) => html, // strip tags only; don't turn "a < b" into "a &lt; b"
});

export const stripHtml = (value) => stripper.process(value).trim();

/** A trimmed string with all HTML removed. Chain .min/.max/.required as needed. */
export const safeString = () => Joi.string().trim().custom(stripHtml, 'strip HTML');

export const objectId = () =>
  Joi.string()
    .pattern(/^[a-f\d]{24}$/i)
    .messages({ 'string.pattern.base': '{{#label}} must be a valid id' });

export const idParams = Joi.object({ id: objectId().required() });
