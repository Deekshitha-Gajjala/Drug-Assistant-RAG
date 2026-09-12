import { useState } from "react";

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Pill,
  ArrowRight
} from "lucide-react";


function Login({
  apiUrl,
  onLogin,
  onRegisterPage
}) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  const handleSubmit = async (event) => {

    event.preventDefault();

    setError("");


    if (!email.trim()) {

      setError(
        "Please enter your email."
      );

      return;
    }


    if (!password) {

      setError(
        "Please enter your password."
      );

      return;
    }


    setLoading(true);


    try {

      const response =
        await fetch(
          `${apiUrl}/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
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
          "Login failed."
        );

      }


      onLogin(
        data.user,
        data.access_token
      );


    } catch (err) {

      setError(
        err.message ||
        "Unable to login."
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
          Welcome back
        </h2>


        <p>
          Sign in to continue to DrugAssist
        </p>

      </div>


      <form
        className="auth-form"
        onSubmit={handleSubmit}
      >

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
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
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
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
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


        {/* ERROR */}

        {error && (

          <div className="auth-error">

            {error}

          </div>

        )}


        {/* LOGIN BUTTON */}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading}
        >

          {loading ? (
            <>
              <span className="button-spinner" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={18} />
            </>
          )}

        </button>

      </form>


      {/* REGISTER */}

      <div className="auth-switch">

        <span>
          Don't have an account?
        </span>


        <button
          type="button"
          onClick={onRegisterPage}
        >
          Create account
        </button>

      </div>

    </div>

  );
}


export default Login;