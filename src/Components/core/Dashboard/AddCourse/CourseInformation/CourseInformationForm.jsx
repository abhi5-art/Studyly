import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { addCourseDetails, editCourseDetails, fetchCourseCategories } from '../../../../../services/operations/courseDetailsAPI';
import { HiOutlineCurrencyRupee } from 'react-icons/hi';
import RequirementField from './RequirementField';
import { setStep, setCourse, setEditCourse } from '../../../../../slices/courseSlice';
import IconBtn from '../../../../common/IconBtn';
import { COURSE_STATUS } from '../../../../../utils/constants';
import { toast } from 'react-hot-toast';
import Upload from './Upload';
import ChipInput from './ChipInput';

const CATEGORY_TAGS = {
  Programming: [
    "JavaScript", "Python", "React", "Node.js", 
    "HTML/CSS", "TypeScript", "Django", "Flask"
  ],
  Design: [
    "UI/UX", "Figma", "Adobe XD", "Photoshop",
    "Illustrator", "Prototyping", "Wireframing"
  ],
  Business: [
    "Marketing", "Finance", "Startups", "Management",
    "Entrepreneurship", "Leadership", "E-commerce"
  ],
  Marketing: [
    "Digital Marketing", "SEO", "Social Media", 
    "Content Marketing", "Email Marketing", "Analytics"
  ]
};

const CourseInformationForm = () => {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm();

  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { course, editCourse } = useSelector((state) => state.course);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const selectedCategoryId = watch("courseCategory");
  const selectedCategory = categories.find(cat => cat._id === selectedCategoryId);

  // Fetch categories on component mount
  useEffect(() => {
    const getCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await fetchCourseCategories();
        setCategories(result);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    getCategories();
  }, []);

  // Initialize form with course data when in edit mode
  useEffect(() => {
    if (editCourse && course) {
      const initialValues = {
        courseTitle: course.courseName || "",
        courseShortDesc: course.courseDescription || "",
        coursePrice: course.price || 0,
        courseTags: course.tag ? JSON.parse(course.tag) : [],
        courseBenefits: course.whatYouWillLearn || "",
        courseCategory: course.category?._id || "",
        courseRequirements: course.instructions || [],
        courseImage: course.thumbnail || null,
      };
      reset(initialValues);
    }
  }, [editCourse, course, reset, categories]);

  const getSuggestedTags = useCallback(() => {
    if (!selectedCategory) return [];
    return CATEGORY_TAGS[selectedCategory.name] || [];
  }, [selectedCategory]);

  const isFormUpdated = useCallback(() => {
    if (!editCourse) return true;
    
    const currentValues = getValues();
    const originalValues = {
      courseTitle: course.courseName,
      courseShortDesc: course.courseDescription,
      coursePrice: course.price,
      courseTags: course.tag ? JSON.parse(course.tag) : [],
      courseBenefits: course.whatYouWillLearn,
      courseCategory: course.category?._id,
      courseRequirements: course.instructions,
      courseImage: course.thumbnail,
    };

    return Object.keys(currentValues).some(key => {
      if (key === 'courseImage') {
        return currentValues[key] !== originalValues[key];
      }
      if (Array.isArray(currentValues[key])) {
        return JSON.stringify(currentValues[key]) !== JSON.stringify(originalValues[key]);
      }
      return currentValues[key] !== originalValues[key];
    });
  }, [editCourse, course, getValues]);

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      
      if (editCourse) {
        if (!isFormUpdated()) {
          toast.error("No changes detected");
          return;
        }
        formData.append("courseId", course._id);
      }

      // Append common fields
      formData.append("courseName", data.courseTitle.trim());
      formData.append("courseDescription", data.courseShortDesc.trim());
      formData.append("price", Number(data.coursePrice));
      formData.append("whatYouWillLearn", data.courseBenefits.trim());
      formData.append("category", data.courseCategory);
      formData.append("instructions", JSON.stringify(data.courseRequirements || []));
      formData.append("tag", JSON.stringify(data.courseTags || []));
      
      if (data.courseImage) {
        formData.append("thumbnailImage", data.courseImage);
      }

      if (!editCourse) {
        formData.append("status", COURSE_STATUS.DRAFT);
      }

      const result = await (editCourse 
        ? editCourseDetails(formData, token)
        : addCourseDetails(formData, token));

      if (result) {
        dispatch(editCourse ? setEditCourse(false) : setStep(2));
        dispatch(setCourse(result));
        toast.success(`Course ${editCourse ? 'updated' : 'created'} successfully`);
      }
    } catch (error) {
      console.error("Error submitting course:", error);
      toast.error(error.response?.data?.message || "An error occurred while processing your request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-md border border-richblack-700 bg-richblack-800 p-6">
      {/* Course Title */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseTitle">
          Course Title <sup className="text-pink-200">*</sup>
        </label>
        <input
          id="courseTitle"
          placeholder="Enter Course Title"
          {...register("courseTitle", { 
            required: "Course Title is required",
            minLength: {
              value: 10,
              message: "Title should be at least 10 characters"
            }
          })}
          className="form-style w-full"
        />
        {errors.courseTitle && (
          <span className="ml-2 text-xs text-pink-200">
            {errors.courseTitle.message}
          </span>
        )}
      </div>

      {/* Course Short Description */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseShortDesc">
          Course Short Description <sup className="text-pink-200">*</sup>
        </label>
        <textarea
          id="courseShortDesc"
          placeholder="Enter Description"
          {...register("courseShortDesc", { 
            required: "Course Description is required",
            minLength: {
              value: 30,
              message: "Description should be at least 30 characters"
            }
          })}
          className="form-style resize-x-none min-h-[130px] w-full"
        />
        {errors.courseShortDesc && (
          <span className="ml-2 text-xs text-pink-200">
            {errors.courseShortDesc.message}
          </span>
        )}
      </div>

      {/* Course Price */}
      <div className="relative flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="coursePrice">
          Course Price (in INR) <sup className="text-pink-200">*</sup>
        </label>
        <div className="relative">
          <HiOutlineCurrencyRupee 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-richblack-400" 
            size={20} 
          />
          <input
            id="coursePrice"
            placeholder="Enter Course Price"
            type="number"
            {...register("coursePrice", {
              required: "Course Price is required",
              valueAsNumber: true,
              min: { 
                value: 0, 
                message: "Price cannot be negative" 
              }
            })}
            className="form-style w-full pl-10"
          />
        </div>
        {errors.coursePrice && (
          <span className="ml-2 text-xs text-pink-200">
            {errors.coursePrice.message}
          </span>
        )}
      </div>

      {/* Course Category */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseCategory">
          Course Category <sup className="text-pink-200">*</sup>
        </label>
        <select
          id="courseCategory"
          disabled={editCourse || loadingCategories}
          className="form-style w-full"
          {...register("courseCategory", { 
            required: "Course Category is required" 
          })}
        >
          <option value="">{loadingCategories ? "Loading categories..." : "Select a Category"}</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.courseCategory && (
          <span className="ml-2 text-xs text-pink-200">
            {errors.courseCategory.message}
          </span>
        )}
      </div>

      {/* Tags Input */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5">
          Tags <sup className="text-pink-200">*</sup>
        </label>
        
        {selectedCategory && getSuggestedTags().length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-richblack-200 mb-1">
              Suggested tags for {selectedCategory.name}:
            </p>
            <div className="flex flex-wrap gap-2">
              {getSuggestedTags().map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => {
                    const currentTags = getValues("courseTags") || [];
                    if (!currentTags.includes(tag)) {
                      setValue("courseTags", [...currentTags, tag], { 
                        shouldValidate: true,
                        shouldDirty: true 
                      });
                    }
                  }}
                  className="text-xs bg-richblack-700 text-richblack-5 px-3 py-1 rounded-full hover:bg-richblack-600 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <ChipInput
          label="Tags"
          name="courseTags"
          placeholder="Enter tags or select from suggestions"
          register={register}
          errors={errors}
          setValue={setValue}
          getValues={getValues}
          required
        />
      </div>

      {/* Course Image Upload */}
      <Upload
        name="courseImage"
        label="Course Thumbnail"
        register={register}
        errors={errors}
        setValue={setValue}
        required={!editCourse}
      />

      {/* Benefits of the Course */}
      <div className="flex flex-col space-y-2">
        <label className="text-sm text-richblack-5" htmlFor="courseBenefits">
          What Students Will Learn <sup className="text-pink-200">*</sup>
        </label>
        <textarea
          id="courseBenefits"
          placeholder="Enter key learning outcomes"
          {...register("courseBenefits", { 
            required: "Learning outcomes are required",
            minLength: {
              value: 50,
              message: "Please provide at least 50 characters"
            }
          })}
          className="form-style resize-x-none min-h-[130px] w-full"
        />
        {errors.courseBenefits && (
          <span className="ml-2 text-xs text-pink-200">
            {errors.courseBenefits.message}
          </span>
        )}
      </div>

      {/* Requirements/Instructions */}
      <RequirementField
        name="courseRequirements"
        label="Requirements/Instructions"
        register={register}
        errors={errors}
        setValue={setValue}
        getValues={getValues}
      />

      {/* Form Actions */}
      <div className="flex justify-end gap-x-3 pt-4">
        {editCourse && (
          <button
            type="button"
            onClick={() => dispatch(setStep(2))}
            className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-richblack-300 text-richblack-900 hover:bg-richblack-200 transition-colors"
          >
            Continue Without Saving
          </button>
        )}

        <IconBtn
          type="submit"
          text={!editCourse ? "Next" : "Save Changes"}
          disabled={isSubmitting || (editCourse && !isDirty) || loadingCategories}
          customClasses={`${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      </div>
    </form>
  );
};

export default CourseInformationForm;