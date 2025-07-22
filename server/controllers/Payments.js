const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const { paymentSuccess } = require("../mail/templates/paymentSuccess");
const { default: mongoose } = require("mongoose");
const crypto = require("crypto");
const CourseProgress = require("../models/CourseProgress");

// Minimum amount in paise (₹1 = 100 paise)
const MIN_AMOUNT = 100;

exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user.id;

  try {
    // Validation
    if (!courses || courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid course IDs",
      });
    }

    let totalAmount = 0;
    const validCourses = [];

    // Verify each course and calculate total amount
    for (const course_id of courses) {
      try {
        const course = await Course.findById(course_id);
        if (!course) {
          return res.status(404).json({
            success: false,
            message: `Course not found: ${course_id}`,
          });
        }

        // Check if user is already enrolled
        const uid = new mongoose.Types.ObjectId(userId);
        if (course.studentsEnrolled.includes(uid)) {
          return res.status(400).json({
            success: false,
            message: "Student is already enrolled in this course",
          });
        }

        // Validate course price
        if (course.price < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid price for course: ${course.courseName}`,
          });
        }

        validCourses.push(course_id);
        totalAmount += course.price;
      } catch (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    }

    // Validate total amount
    if (totalAmount * 100 < MIN_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Total amount must be at least ₹${MIN_AMOUNT/100}`,
        minimumAmount: MIN_AMOUNT,
        yourAmount: totalAmount * 100
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(totalAmount * 100), // Convert to paise and ensure integer
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        courses: validCourses,
        userId
      }
    };

    try {
      const paymentResponse = await instance.orders.create(options);
      return res.status(200).json({
        success: true,
        orderId: paymentResponse.id,
        currency: paymentResponse.currency,
        amount: paymentResponse.amount,
        courses: validCourses
      });
    } catch (error) {
      console.error("Razorpay order creation failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create payment order",
        razorpayError: error.error ? error.error.description : error.message
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifySignature = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  const { courses } = req.body;
  const userId = req.user.id;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !courses) {
    return res.status(400).json({
      success: false,
      message: "Payment details are incomplete",
    });
  }

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Enroll student in each course
    for (const course_id of courses) {
      try {
        // Update course with student enrollment
        const course = await Course.findByIdAndUpdate(
          course_id,
          { $push: { studentsEnrolled: userId } },
          { new: true }
        );

        if (!course) {
          console.error(`Course not found: ${course_id}`);
          continue; // Skip to next course
        }

        // Update user with course
        await User.findByIdAndUpdate(
          userId,
          { $push: { courses: course_id } },
          { new: true }
        );

        // Create and save course progress
        const newCourseProgress = new CourseProgress({
          userID: userId,
          courseID: course_id,
        });
        await newCourseProgress.save();

        // Update user's course progress
        await User.findByIdAndUpdate(
          userId,
          { $push: { courseProgress: newCourseProgress._id } },
          { new: true }
        );

        // Send enrollment email
        const recipient = await User.findById(userId);
        if (recipient) {
          const emailTemplate = courseEnrollmentEmail(
            course.courseName,
            `${recipient.firstName} ${recipient.lastName}`,
            course.courseDescription,
            course.thumbnail
          );
          
          await mailSender(
            recipient.email,
            `Enrollment Confirmation: ${course.courseName}`,
            emailTemplate
          );
        }
      } catch (error) {
        console.error(`Error processing course ${course_id}:`, error);
        // Continue with next course even if one fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and courses enrolled successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.sendPaymentSuccessEmail = async (req, res) => {
  const { amount, paymentId, orderId } = req.body;
  const userId = req.user.id;

  if (!amount || !paymentId) {
    return res.status(400).json({
      success: false,
      message: "Please provide valid payment details",
    });
  }

  try {
    const enrolledStudent = await User.findById(userId);
    if (!enrolledStudent) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await mailSender(
      enrolledStudent.email,
      "Payment Successful - Study Notion",
      paymentSuccess(
        amount / 100, // Convert back to rupees
        paymentId,
        orderId,
        enrolledStudent.firstName,
        enrolledStudent.lastName
      )
    );

    return res.status(200).json({
      success: true,
      message: "Payment success email sent successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};