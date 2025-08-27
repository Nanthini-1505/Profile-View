import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['College', 'HR'], required: true }, // 🔥 updated to match frontend
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true },
  college: { type: String },
  company: { type: String },
    address: { type: String },   
  district: { type: String }, 
state: { type: String },      
  // Fields for Forgot/Reset Password
  resetToken: { type: String },
  resetTokenExpire: { type: Date }
});

export default mongoose.model('User', userSchema);
