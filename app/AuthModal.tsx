"use client";

import { useState, useEffect } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setActive(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

        .au-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: auOverlayIn .3s ease;
        }
        @keyframes auOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .au-box {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.35);
          position: relative;
          overflow: hidden;
          width: 850px;
          max-width: 100%;
          height: 530px;
          font-family: 'Poppins', sans-serif;
          animation: auBoxIn .4s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes auBoxIn {
          from { opacity: 0; transform: scale(.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1)   translateY(0);    }
        }

        .au-close {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 200;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1.5px solid rgba(0,0,0,0.15);
          background: rgba(255,255,255,0.9);
          color: #555;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .2s;
        }
        .au-close:hover { background: #003e4d; color: #fff; border-color: #003e4d; }

        .au-form {
          position: absolute;
          top: 0;
          height: 100%;
          transition: all .6s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 48px;
          text-align: center;
          background: #fff;
        }
        .au-form.login    { left: 0; width: 50%; z-index: 2; }
        .au-form.register { left: 0; width: 50%; opacity: 0; z-index: 1; }

        .au-box.active .au-form.login    { transform: translateX(100%); }
        .au-box.active .au-form.register { transform: translateX(100%); opacity: 1; z-index: 5; animation: auShow .6s; }

        @keyframes auShow {
          0%,49.99% { opacity:0; z-index:1; }
          50%,100%  { opacity:1; z-index:5; }
        }

        .au-form h1 { font-size: 26px; font-weight: 700; color: #1a1a2e; }

        .au-socials { display: flex; gap: 10px; margin: 16px 0; }
        .au-socials a {
          width: 42px; height: 42px;
          border-radius: 50%;
          border: 1.5px solid #e0e0e0;
          display: flex; align-items: center; justify-content: center;
          color: #003e4d; font-size: 14px; font-weight: 700;
          text-decoration: none;
          transition: all .3s;
        }
        .au-socials a:hover {
          border-color: #003e4d;
          background: #003e4d;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,62,77,.4);
        }

        .au-sub { font-size: 13px; color: #888; margin: 4px 0 6px; }

        .au-form input {
          background: #f3f4f6;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 12px 16px;
          margin: 6px 0;
          width: 100%;
          font-size: 14px;
          font-family: 'Poppins', sans-serif;
          outline: none;
          transition: all .3s;
        }
        .au-form input:focus {
          border-color: #003e4d;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(0,62,77,.12);
        }

        .au-forgot {
          color: #003e4d; font-size: 13px;
          text-decoration: none; margin: 8px 0;
          transition: color .3s;
        }
        .au-forgot:hover { color: #003e4d; }

        .au-btn {
          border-radius: 25px;
          border: none;
          background: linear-gradient(135deg, #003e4d, #003e4d);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 13px 48px;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 12px;
          transition: all .3s;
          box-shadow: 0 4px 15px rgba(0,62,77,.4);
          font-family: 'Poppins', sans-serif;
        }
        .au-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,62,77,.55); }
        .au-btn:active { transform: translateY(0); }

        .au-panel-wrap {
          position: absolute;
          top: 0; left: 50%;
          width: 50%; height: 100%;
          overflow: hidden;
          transition: transform .6s ease-in-out;
          z-index: 100;
        }
        .au-box.active .au-panel-wrap { transform: translateX(-100%); }

        .au-panel {
          background: linear-gradient(135deg, #003e4d, #003e4d);
          position: relative;
          left: -100%;
          height: 100%;
          width: 200%;
          transition: transform .6s ease-in-out;
        }
        .au-box.active .au-panel { transform: translateX(50%); }

        .au-panel-side {
          position: absolute;
          top: 0; height: 100%; width: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column;
          padding: 0 44px;
          text-align: center;
          transition: transform .6s ease-in-out;
        }
        .au-panel-side h1 { color: #fff; font-size: 26px; font-weight: 700; }
        .au-panel-side p  { color: rgba(255,255,255,.85); font-size: 14px; font-weight: 300; line-height: 1.7; margin: 16px 0 28px; }

        .au-panel-side.left  { transform: translateX(-20%); }
        .au-box.active .au-panel-side.left  { transform: translateX(0); }
        .au-panel-side.right { right: 0; transform: translateX(0); }
        .au-box.active .au-panel-side.right { transform: translateX(20%); }

        .au-ghost {
          border-radius: 25px;
          border: 2px solid #fff;
          background: transparent;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 12px 44px;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          transition: all .3s;
        }
        .au-ghost:hover { background: rgba(255,255,255,.15); }

        @media (max-width: 640px) {
          .au-box { height: auto; min-height: 460px; }
          .au-form { position: static !important; width: 100% !important; transform: none !important; opacity: 1 !important; padding: 36px 24px; }
          .au-form.register { display: none; }
          .au-box.active .au-form.login    { display: none; }
          .au-box.active .au-form.register { display: flex; animation: none; }
          .au-panel-wrap { display: none !important; }
          .au-mobile-switch { display: block !important; margin-top: 18px; }
        }
        .au-mobile-switch { display: none; text-align: center; }
        .au-mobile-switch p { font-size: 14px; color: #888; margin-bottom: 10px; }
        .au-mobile-btn {
          border-radius: 25px;
          border: 2px solid #003e4d;
          background: transparent;
          color: #003e4d;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 36px;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          transition: all .3s;
        }
        .au-mobile-btn:hover { background: #003e4d; color: #fff; }
      `}</style>

      <div className="au-overlay" onClick={onClose}>
        <div
          className={`au-box${active ? " active" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="au-close" onClick={onClose} aria-label="Close">✕</button>

          {/* REGISTER */}
          <div className="au-form register">
            <h1>Create Account</h1>
            <div className="au-socials">
              <a href="#">f</a>
              <a href="#">G</a>
              <a href="#">in</a>
            </div>
            <span className="au-sub">or use your email for registration</span>
            <input type="text" placeholder="Full Name" />
            <input type="email" placeholder="Email Address" />
            <input type="password" placeholder="Password" />
            <button className="au-btn" type="button">Sign Up</button>
            <div className="au-mobile-switch">
              <p>Already have an account?</p>
              <button className="au-mobile-btn" type="button" onClick={() => setActive(false)}>Sign In</button>
            </div>
          </div>

          {/* LOGIN */}
          <div className="au-form login">
            <h1>Sign In</h1>
            <div className="au-socials">
              <a href="#">f</a>
              <a href="#">G</a>
              <a href="#">in</a>
            </div>
            <span className="au-sub">or use your account</span>
            <input type="email" placeholder="Email Address" />
            <input type="password" placeholder="Password" />
            <a href="#" className="au-forgot">Forgot your password?</a>
            <button className="au-btn" type="button">Sign In</button>
            <div className="au-mobile-switch">
              <p>Don&apos;t have an account?</p>
              <button className="au-mobile-btn" type="button" onClick={() => setActive(true)}>Sign Up</button>
            </div>
          </div>

          {/* SLIDING PANEL */}
          <div className="au-panel-wrap">
            <div className="au-panel">
              <div className="au-panel-side left">
                <h1>Welcome Back!</h1>
                <p>Stay connected by logging in with your credentials and continue your experience</p>
                <button className="au-ghost" type="button" onClick={() => setActive(false)}>Sign In</button>
              </div>
              <div className="au-panel-side right">
                <h1>Hey There!</h1>
                <p>Begin your amazing journey by creating an account with us today</p>
                <button className="au-ghost" type="button" onClick={() => setActive(true)}>Sign Up</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
