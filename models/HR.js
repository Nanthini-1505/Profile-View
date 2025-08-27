import mongoose from 'mongoose';

const hrSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String, // <-- ensure this exists
  company: String,
  address: { type: String, default: "" },
    state: { type: String, default: "" },
  district: { type: String, default: "" },
});


const HR = mongoose.model('HR', hrSchema);

export default HR;
