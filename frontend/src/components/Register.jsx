import { useState } from "react";

import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Pill,
  ArrowRight,
  Check
} from "lucide-react";


function Register({
  apiUrl,
  onLoginPage,
  onRegistered
}) {

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");

    setSuccess("");


    if (!name.trim()) {

      setError(
        "Please enter your name."
      );

      return;
    }


    if (!email.trim()) {

      setError(
        "Please enter your email."
      );

      return;
    }


    if (password.length < 6) {

      setError(
        "Password must contain at least 6 characters."
      );

      return;
    }


    if (
      password !==
      confirmPassword
    ) {

      setError(
        "Passwords do not match."
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${apiUrl}/register`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              name:
                name.trim(),

              email:
                email.trim(),

              password

            })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Registration failed."
        );

      }


      setSuccess(
        "Account created successfully. You can now sign in."
      );


      setTimeout(
        () => {

          onRegistered();

        },
        1000
      );


    } catch (err) {

      setError(
        err.message ||
        "Unable to create account."
      );

    } finally {

      setLoading(false);

    }
  };


  return (

    <div className="auth-card">

      <div className="auth-card-header">

        <div className="auth-icon">

          <Pill size={27} />

        </div>


        <h2>
          Create your account
        </h2>


        <p>
          Start using DrugAssist
        </p>

      </div>


      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >

        {/* NAME */}

        <div className="auth-field">

          <label>
            Full name
          </label>


          <div className="input-wrapper">

            <User size={18} />


            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              autoComplete="name"
            />

          </div>

        </div>


        {/* EMAIL */}

        <div className="auth-field">

          <label>
            Email
          </label>


          <div className="input-wrapper">

            <Mail size={18} />


            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              autoComplete="email"
            />

          </div>

        </div>


        {/* PASSWORD */}

        <div className="auth-field">

          <label>
            Password
          </label>


          <div className="input-wrapper">

            <Lock size={18} />


            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
            />


            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword(
                  previous =>
                    !previous
                )
              }
            >

              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}

            </button>

          </div>

        </div>


        {/* CONFIRM PASSWORD */}

        <div className="auth-field">

          <label>
            Confirm password
          </label>


          <div className="input-wrapper">

            <Check size={18} />


            <input
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
            />


            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowConfirmPassword(
                  previous =>
                    !previous
                )
              }
            >

              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}

            </button>

          </div>

        </div>


        {/* ERROR */}

        {error && (

          <div className="auth-error">

            {error}

          </div>

        )}


        {/* SUCCESS */}

        {success && (

          <div className="auth-success">

            {success}

          </div>

        )}


        {/* REGISTER */}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading}
        >

          {loading ? (
            <>
              <span className="button-spinner" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight size={18} />
            </>
          )}

        </button>

      </form>


      {/* LOGIN */}

      <div className="auth-switch">

        <span>
          Already have an account?
        </span>


        <button
          type="button"
          onClick={onLoginPage}
        >
          Sign in
        </button>

      </div>

    </div>

  );
}


export default Register;