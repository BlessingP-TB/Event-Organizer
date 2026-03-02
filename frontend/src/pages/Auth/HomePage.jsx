import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/tut_logo.png";
import "../../styles/abstracts-auth/_welcomepage.scss";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <nav className="navbar">
        <img src={logo} alt="TUT Logo" className="logo" />
      </nav>

      <div className="welcome-content">
        <h1>
          Welcome to the <br /> Smart Event System!
        </h1>
        <p>
          Your ultimate guide to campus events. Discover, register, and engage
          with everything happening at TUT.
        </p>
        <button onClick={() => navigate("/login")}>Get Started</button>
      </div>
    </div>
  );
}
