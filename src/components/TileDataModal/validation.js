import Schema from "validate";

const configSchema = new Schema({
  data: [
    {
      name: { type: String, required: true },
      type: { type: String, required: true },
      size: { type: Number },
      symmetry: { type: String, length: { min: 1, max: 2 }, required: true },
      displayName: { type: String, required: false },
      uri: { type: String, required: true },
    },
  ],
});

export const validateConfig = (config) => {
  return configSchema.validate({ data: config });
};
