import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "@/pages/profile/Profile.css";
import ProfileEditModal from "@/pages/profile/components/modal/profile/ProfileEditModal";
import AdminLayout from "@/components/layout/Adminlayout";
import {
  PencilSquare,
  CameraFill,
  PersonFill,
  TelephoneFill,
  PeopleFill,
  MortarboardFill,
  FileEarmarkTextFill,
  BriefcaseFill,
} from "react-bootstrap-icons";
import api from "@/config/axios";
import { useAuth } from "@/context/AuthContext";
import "@/assets/style/global.css";
import coverPhoto from "@/assets/images/cover_photo.jpg";
import ToastMessage from "@/components/common/ToastMessage.jsx";
import {
  ToastContainer,
  Modal,
  Button,
  Form,
  Spinner,
  Image,
  Alert,
} from "react-bootstrap";

const Profile = ({ setIsAuth }) => {
  const { isAuth } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [activeSection, setActiveSection] = useState("personal");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [profilePicError, setProfilePicError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const hasFetched = useRef(false);
  const [toast, setShowToast] = useState({
    show: false,
    message: "",
    type: "",
  });
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get("/my-profile");

      if (response.data && response.data.isSuccess) {
        const userData = response.data.user;
        setProfileData({
          id: userData.id,
          employee_id: userData.employee_id,
          first_name: userData.first_name,
          middle_name: userData.middle_name || null,
          last_name: userData.last_name,
          suffix: userData.suffix || null,
          email: userData.email,
          phone: userData.phone || null,
          sex: userData.sex || "Male",
          date_of_birth: userData.date_of_birth || null,
          place_of_birth: userData.place_of_birth || null,
          blood_type: userData.blood_type || null,
          citizenship: userData.citizenship || null,
          civil_status: userData.civil_status || null,
          height_m: userData.height_m || null,
          weight_kg: userData.weight_kg || null,
          residential_address: userData.residential_address || null,
          residential_tel_no: userData.residential_tel_no || null,
          residential_zipcode: userData.residential_zipcode || null,
          permanent_address: userData.permanent_address || null,
          permanent_tel_no: userData.permanent_tel_no || null,
          permanent_zipcode: userData.permanent_zipcode || null,
          father_name: userData.father_name || null,
          mother_name: userData.mother_name || null,
          parents_address: userData.parents_address || null,
          spouse_name: userData.spouse_name || null,
          spouse_occupation: userData.spouse_occupation || null,
          spouse_employer: userData.spouse_employer || null,
          spouse_tel_no: userData.spouse_tel_no || null,
          spouse_business_address: userData.spouse_business_address || null,
          emergency_contact_name: userData.emergency_contact_name || null,
          emergency_contact_relation:
            userData.emergency_contact_relation || null,
          emergency_contact_number: userData.emergency_contact_number || null,
          elementary_school_name: userData.elementary_school_name || null,
          elementary_inclusive_dates:
            userData.elementary_inclusive_dates || null,
          elementary_degree_course: userData.elementary_degree_course || null,
          elementary_highest_level: userData.elementary_highest_level || null,
          elementary_year_graduated: userData.elementary_year_graduated || null,
          elementary_honors: userData.elementary_honors || null,
          secondary_school_name: userData.secondary_school_name || null,
          secondary_inclusive_dates: userData.secondary_inclusive_dates || null,
          secondary_degree_course: userData.secondary_degree_course || null,
          secondary_highest_level: userData.secondary_highest_level || null,
          secondary_year_graduated: userData.secondary_year_graduated || null,
          secondary_honors: userData.secondary_honors || null,
          college_school_name: userData.college_school_name || null,
          college_inclusive_dates: userData.college_inclusive_dates || null,
          college_degree_course: userData.college_degree_course || null,
          college_highest_level: userData.college_highest_level || null,
          college_year_graduated: userData.college_year_graduated || null,
          college_honors: userData.college_honors || null,
          vocational_school_name: userData.vocational_school_name || null,
          vocational_inclusive_dates:
            userData.vocational_inclusive_dates || null,
          vocational_degree_course: userData.vocational_degree_course || null,
          vocational_highest_level: userData.vocational_highest_level || null,
          vocational_year_graduated: userData.vocational_year_graduated || null,
          vocational_honors: userData.vocational_honors || null,
          graduate_school_name: userData.graduate_school_name || null,
          graduate_inclusive_dates: userData.graduate_inclusive_dates || null,
          graduate_degree_course: userData.graduate_degree_course || null,
          graduate_highest_level: userData.graduate_highest_level || null,
          graduate_year_graduated: userData.graduate_year_graduated || null,
          graduate_honors: userData.graduate_honors || null,
          sss_no: userData.sss_no || null,
          gsis_no: userData.gsis_no || null,
          pagibig_no: userData.pagibig_no || null,
          philhealth_no: userData.philhealth_no || null,
          tin_no: userData.tin_no || null,
          salary_mode: userData.salary_mode || null,
          face_id: userData.face_id || null,
          resume: userData.resume || null,
          profile_picture: userData.profile_picture || null,
        });

        // Set existing profile picture as preview if available
        if (userData.profile_picture) {
          setPreviewUrl(userData.profile_picture);
        }
      } else {
        setError(response.data?.message || "Failed to load profile");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError(
        err.response?.data?.message || err.message || "Failed to load profile",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add this useEffect to handle redirection when not authenticated
  useEffect(() => {
    if (!isAuth) {
      if (setIsAuth) setIsAuth(false);
      navigate("/");
      return;
    }
  }, [isAuth, navigate, setIsAuth]);

  useEffect(() => {
    if (isAuth) {
      if (hasFetched.current) return;
      hasFetched.current = true;
      fetchProfileData();
      setIsLoading(true);
    }
  }, [isAuth, fetchProfileData]);

  const handleUpdateProfile = async () => {
    try {
      await fetchProfileData();
      setShowToast({
        show: true,
        message: "Profile updated successfully!",
        type: "success",
      });
      setShowModal(false);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Error updating profile";
      console.error("Error updating profile:", err);
      setShowToast({
        show: true,
        message: errorMessage,
        type: "danger",
      });
    }
  };

  const openEdit = (section) => {
    setActiveSection(section);
    setShowModal(true);
  };

  const profileSections = [
    { key: "personal", label: "Personal Information", icon: PersonFill },
    { key: "contact", label: "Contact Information", icon: TelephoneFill },
    { key: "family", label: "Family Information", icon: PeopleFill },
    { key: "education", label: "Education", icon: MortarboardFill },
    { key: "government", label: "Government IDs", icon: FileEarmarkTextFill },
    { key: "other", label: "Other Information", icon: BriefcaseFill },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setProfilePicError("Please select a valid image file (JPEG, PNG)");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setProfilePicError("File size should be less than 5MB");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setProfilePicError(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload profile picture
  const handleUploadProfilePicture = async () => {
    if (!selectedFile) {
      setProfilePicError("Please select a file first");
      return;
    }

    try {
      setIsUploading(true);
      setProfilePicError(null);

      const formData = new FormData();
      formData.append("profile_picture", selectedFile);

      const response = await api.post("/update-profile-picture", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.isSuccess) {
        // Update profile data with new picture
        setProfileData((prev) => ({
          ...prev,
          profile_picture: response.data.profile_picture_url || previewUrl,
        }));

        setShowToast({
          show: true,
          message: "Profile picture updated successfully!",
          type: "success",
        });

        handleCloseProfilePicModal();
      } else {
        throw new Error(
          response.data?.message || "Failed to upload profile picture",
        );
      }
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      setProfilePicError(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload profile picture",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      setIsUploading(true);
      const response = await api.delete("/remove-profile-picture");

      if (response.data && response.data.isSuccess) {
        setProfileData((prev) => ({
          ...prev,
          profile_picture: null,
        }));
        setPreviewUrl(null);
        setSelectedFile(null);

        setShowToast({
          show: true,
          message: "Profile picture removed successfully!",
          type: "success",
        });

        handleCloseProfilePicModal();
      } else {
        throw new Error(
          response.data?.message || "Failed to remove profile picture",
        );
      }
    } catch (err) {
      console.error("Error removing profile picture:", err);
      setProfilePicError(
        err.response?.data?.message ||
          err.message ||
          "Failed to remove profile picture",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenProfilePicModal = () => {
    setShowProfilePicModal(true);
    setProfilePicError(null);
  };

  const handleCloseProfilePicModal = () => {
    setShowProfilePicModal(false);
    setSelectedFile(null);
    setProfilePicError(null);

    // Reset preview to existing profile picture if no new file selected
    if (profileData?.profile_picture && !selectedFile) {
      setPreviewUrl(profileData.profile_picture);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!profileData) return "";
    const first = profileData.first_name?.charAt(0) || "";
    const last = profileData.last_name?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  // Don't render anything if not authenticated (will redirect)
  if (!isAuth) {
    return null;
  }

  if (isLoading) {
    return (
      <AdminLayout setIsAuth={setIsAuth}>
        <div className="profile-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading profile...</span>
          </div>
          <p>Loading profile information...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error && !profileData) {
    return (
      <AdminLayout setIsAuth={setIsAuth}>
        <div className="profile-error alert alert-danger">
          <h4>Error Loading Profile</h4>
          <p>{error}</p>
          <button className="btn btn-primary mt-2" onClick={fetchProfileData}>
            Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  if (!profileData) {
    return (
      <AdminLayout setIsAuth={setIsAuth}>
        <div className="profile-error alert alert-warning">
          No profile data available. Please contact administrator.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout setIsAuth={isAuth}>
      <div className="user-container">
        {/* Header Section */}
        <div className="user-header">
          <div className="user-cover">
            <img src={coverPhoto} alt="Cover" />
          </div>
          <div className="user-info-section">
            <div className="user-avatar-container">
              <div className="user-avatar">
                {profileData.profile_picture || previewUrl ? (
                  <img
                    src={previewUrl || profileData.profile_picture}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  getInitials()
                )}
              </div>
              <div
                className="user-avatar-badge"
                onClick={handleOpenProfilePicModal}
              >
                <CameraFill size={20} />
              </div>
            </div>
            <div className="user-basic-info">
              <h1 className="user-name fw-bold">
                {profileData.first_name}{" "}
                {profileData.middle_name && profileData.middle_name + " "}
                {profileData.last_name}{" "}
                {profileData.suffix && profileData.suffix}
              </h1>
              <p className="user-employee-id">{profileData.employee_id}</p>
              <p className="user-email">{profileData.email}</p>
            </div>
            <button
              className="user-edit-btn"
              onClick={() => openEdit("personal")}
            >
              <PencilSquare className="me-2" size={16} /> Edit Profile
            </button>
          </div>
        </div>

        <nav className="profile-tabs" aria-label="Profile sections">
          {profileSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`profile-tab ${activeSection === section.key ? "active" : ""}`}
              onClick={() => setActiveSection(section.key)}
            >
              {React.createElement(section.icon, { size: 14 })}
              <span>{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Error banner */}
        {error && (
          <div
            className="alert alert-warning alert-dismissible fade show"
            role="alert"
          >
            <strong>Note:</strong> {error} Using fallback data.
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
            ></button>
          </div>
        )}

        {/* Main Content */}
        <div className="user-content">
          {/* Personal Information */}
          {activeSection === "personal" && <section className="user-section">
            <div className="user-section-heading">
              <div><span className="section-icon"><PersonFill /></span><div><h2 className="user-section-title">Personal Information</h2><p>Basic details about the employee.</p></div></div>
              <button type="button" className="section-edit-btn" onClick={() => openEdit("personal")}><PencilSquare /> Edit</button>
            </div>
            <div className="user-section-grid">
              <div className="user-info-item">
                <label>First Name:</label>
                <span>{profileData.first_name || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Middle Name:</label>
                <span>{profileData.middle_name || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Last Name:</label>
                <span>{profileData.last_name || "-"}</span>
              </div>
              {profileData.suffix && (
                <div className="user-info-item">
                  <label>Suffix:</label>
                  <span>{profileData.suffix}</span>
                </div>
              )}
              <div className="user-info-item">
                <label>Employee ID:</label>
                <span>{profileData.employee_id || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Email:</label>
                <span>{profileData.email || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Phone:</label>
                <span>{profileData.phone || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Gender:</label>
                <span>{profileData.sex || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Date of Birth:</label>
                <span>{formatDate(profileData.date_of_birth)}</span>
              </div>
              <div className="user-info-item">
                <label>Place of Birth:</label>
                <span>{profileData.place_of_birth || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Blood Type:</label>
                <span>{profileData.blood_type || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Citizenship:</label>
                <span>{profileData.citizenship || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Civil Status:</label>
                <span>{profileData.civil_status || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Height (m):</label>
                <span>{profileData.height_m || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Weight (kg):</label>
                <span>{profileData.weight_kg || "-"}</span>
              </div>
            </div>
          </section>}

          {/* Contact Information */}
          {activeSection === "contact" && <section className="user-section">
            <div className="user-section-heading">
              <div><span className="section-icon"><TelephoneFill /></span><div><h2 className="user-section-title">Contact Information</h2><p>Residential and permanent address details.</p></div></div>
              <button type="button" className="section-edit-btn" onClick={() => openEdit("contact")}><PencilSquare /> Edit</button>
            </div>
            <div className="user-subsection">
              <h3>Residential Address</h3>
              <div className="user-section-grid">
                <div className="user-info-item user-full-width">
                  <label>Address:</label>
                  <span>{profileData.residential_address || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Telephone:</label>
                  <span>{profileData.residential_tel_no || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Zip Code:</label>
                  <span>{profileData.residential_zipcode || "-"}</span>
                </div>
              </div>
            </div>
            <div className="user-subsection">
              <h3>Permanent Address</h3>
              <div className="user-section-grid">
                <div className="user-info-item user-full-width">
                  <label>Address:</label>
                  <span>{profileData.permanent_address || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Telephone:</label>
                  <span>{profileData.permanent_tel_no || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Zip Code:</label>
                  <span>{profileData.permanent_zipcode || "-"}</span>
                </div>
              </div>
            </div>
          </section>}

          {/* Family Information */}
          {activeSection === "family" && <section className="user-section">
            <div className="user-section-heading">
              <div><span className="section-icon"><PeopleFill /></span><div><h2 className="user-section-title">Family Information</h2><p>Details about family members and emergency contact.</p></div></div>
              <button type="button" className="section-edit-btn" onClick={() => openEdit("family")}><PencilSquare /> Edit</button>
            </div>
            <div className="user-subsection">
              <h3>Parents</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>Father's Name:</label>
                  <span>{profileData.father_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Mother's Name:</label>
                  <span>{profileData.mother_name || "-"}</span>
                </div>
                <div className="user-info-item user-full-width">
                  <label>Parents' Address:</label>
                  <span>{profileData.parents_address || "-"}</span>
                </div>
              </div>
            </div>
            <div className="user-subsection">
              <h3>Spouse Information</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>Spouse Name:</label>
                  <span>{profileData.spouse_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Occupation:</label>
                  <span>{profileData.spouse_occupation || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Employer:</label>
                  <span>{profileData.spouse_employer || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Telephone:</label>
                  <span>{profileData.spouse_tel_no || "-"}</span>
                </div>
                <div className="user-info-item user-full-width">
                  <label>Business Address:</label>
                  <span>{profileData.spouse_business_address || "-"}</span>
                </div>
              </div>
            </div>
            <div className="user-subsection">
              <h3>Emergency Contact</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>Name:</label>
                  <span>{profileData.emergency_contact_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Relation:</label>
                  <span>{profileData.emergency_contact_relation || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Telephone:</label>
                  <span>{profileData.emergency_contact_number || "-"}</span>
                </div>
              </div>
            </div>
          </section>}

          {/* Education Background */}
          {activeSection === "education" && <section className="user-section">
            <div className="user-section-heading">
              <div><span className="section-icon"><MortarboardFill /></span><div><h2 className="user-section-title">Education Background</h2><p>Your academic records and achievements.</p></div></div>
              <button type="button" className="section-edit-btn" onClick={() => openEdit("education")}><PencilSquare /> Edit</button>
            </div>
            <div className="user-subsection">
              <h3>Elementary</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>School Name:</label>
                  <span>{profileData.elementary_school_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Inclusive Dates:</label>
                  <span>{profileData.elementary_inclusive_dates || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Degree/Course:</label>
                  <span>{profileData.elementary_degree_course || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Highest Level:</label>
                  <span>{profileData.elementary_highest_level || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Year Graduated:</label>
                  <span>{profileData.elementary_year_graduated || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Honors:</label>
                  <span>{profileData.elementary_honors || "-"}</span>
                </div>
              </div>
            </div>

            <div className="user-subsection">
              <h3>Secondary</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>School Name:</label>
                  <span>{profileData.secondary_school_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Inclusive Dates:</label>
                  <span>{profileData.secondary_inclusive_dates || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Degree/Course:</label>
                  <span>{profileData.secondary_degree_course || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Highest Level:</label>
                  <span>{profileData.secondary_highest_level || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Year Graduated:</label>
                  <span>{profileData.secondary_year_graduated || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Honors:</label>
                  <span>{profileData.secondary_honors || "-"}</span>
                </div>
              </div>
            </div>

            <div className="user-subsection">
              <h3>College</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>School Name:</label>
                  <span>{profileData.college_school_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Inclusive Dates:</label>
                  <span>{profileData.college_inclusive_dates || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Degree/Course:</label>
                  <span>{profileData.college_degree_course || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Highest Level:</label>
                  <span>{profileData.college_highest_level || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Year Graduated:</label>
                  <span>{profileData.college_year_graduated || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Honors:</label>
                  <span>{profileData.college_honors || "-"}</span>
                </div>
              </div>
            </div>

            <div className="user-subsection">
              <h3>Vocational</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>School Name:</label>
                  <span>{profileData.vocational_school_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Inclusive Dates:</label>
                  <span>{profileData.vocational_inclusive_dates || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Degree/Course:</label>
                  <span>{profileData.vocational_degree_course || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Highest Level:</label>
                  <span>{profileData.vocational_highest_level || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Year Graduated:</label>
                  <span>{profileData.vocational_year_graduated || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Honors:</label>
                  <span>{profileData.vocational_honors || "-"}</span>
                </div>
              </div>
            </div>

            <div className="user-subsection">
              <h3>Graduate Studies</h3>
              <div className="user-section-grid">
                <div className="user-info-item">
                  <label>School Name:</label>
                  <span>{profileData.graduate_school_name || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Inclusive Dates:</label>
                  <span>{profileData.graduate_inclusive_dates || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Degree/Course:</label>
                  <span>{profileData.graduate_degree_course || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Highest Level:</label>
                  <span>{profileData.graduate_highest_level || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Year Graduated:</label>
                  <span>{profileData.graduate_year_graduated || "-"}</span>
                </div>
                <div className="user-info-item">
                  <label>Honors:</label>
                  <span>{profileData.graduate_honors || "-"}</span>
                </div>
              </div>
            </div>
          </section>}

          {/* Government IDs */}
          {activeSection === "government" && <section className="user-section">
            <div className="user-section-heading">
              <div><span className="section-icon"><FileEarmarkTextFill /></span><div><h2 className="user-section-title">Government IDs and Numbers</h2><p>Your government-issued identification numbers.</p></div></div>
              <button type="button" className="section-edit-btn" onClick={() => openEdit("government")}><PencilSquare /> Edit</button>
            </div>
            <div className="user-section-grid">
              <div className="user-info-item">
                <label>SSS Number:</label>
                <span>{profileData.sss_no || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>GSIS Number:</label>
                <span>{profileData.gsis_no || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>PAG-IBIG Number:</label>
                <span>{profileData.pagibig_no || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>PhilHealth Number:</label>
                <span>{profileData.philhealth_no || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>TIN Number:</label>
                <span>{profileData.tin_no || "-"}</span>
              </div>
            </div>
          </section>}

          {/* Other Information */}
          {activeSection === "other" && <section className="user-section">
            <div className="user-section-heading">
              <div><span className="section-icon"><BriefcaseFill /></span><div><h2 className="user-section-title">Other Information</h2><p>Additional employment details.</p></div></div>
              <button type="button" className="section-edit-btn" onClick={() => openEdit("other")}><PencilSquare /> Edit</button>
            </div>
            <div className="user-section-grid">
              <div className="user-info-item">
                <label>Salary Mode:</label>
                <span>{profileData.salary_mode || "-"}</span>
              </div>
              <div className="user-info-item">
                <label>Resume:</label>
                <span>
                  {profileData.resume ? (
                    <a
                      href={profileData.resume}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Resume
                    </a>
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div className="user-info-item">
                <label>Face ID:</label>
                <span>
                  {profileData.face_id ? "Registered" : "Not Registered"}
                </span>
              </div>
            </div>
          </section>}
        </div>
        {/* Edit Modal */}
        {showModal && (
          <ProfileEditModal
            profileData={profileData}
            onClose={() => setShowModal(false)}
            onUpdate={handleUpdateProfile}
            initialTab={activeSection}
          />
        )}

        {/* Profile Picture Update Modal */}
        <Modal
          show={showProfilePicModal}
          onHide={handleCloseProfilePicModal}
          centered
          size="md"
        >
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title>Update Profile Picture</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-4">
              <div className="profile-pic-preview mb-3">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Profile Preview"
                    roundedCircle
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                      border: "3px solid #dee2e6",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "150px",
                      height: "150px",
                      borderRadius: "50%",
                      background: "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontSize: "48px",
                      color: "#666",
                      border: "3px solid #dee2e6",
                    }}
                  >
                    {getInitials()}
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg, image/jpg, image/png, image/gif, image/webp"
                style={{ display: "none" }}
              />

              <div className="d-flex justify-content-center gap-3 mb-3">
                <Button
                  variant="primary"
                  onClick={triggerFileInput}
                  disabled={isUploading}
                >
                  {selectedFile ? "Change Image" : "Choose Image"}
                </Button>
                {previewUrl && (
                  <Button
                    variant="danger"
                    onClick={handleRemoveProfilePicture}
                    disabled={isUploading}
                  >
                    Remove Picture
                  </Button>
                )}
              </div>

              {profilePicError && (
                <Alert variant="danger" className="mt-3">
                  {profilePicError}
                </Alert>
              )}

              <Form.Text className="text-muted d-block mt-2">
                Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB.
              </Form.Text>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={handleCloseProfilePicModal}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUploadProfilePicture}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Toast Container */}
        <ToastContainer position="top-end" className="p-3">
          <ToastMessage
            variant={toast.type}
            show={toast.show}
            onClose={() => setShowToast({ ...toast, show: false })}
            delay={3000}
            autohide
          >
            {toast.message}
          </ToastMessage>
        </ToastContainer>
      </div>
    </AdminLayout>
  );
};

export default Profile;
