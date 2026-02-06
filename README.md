# 🏥 SIC - Smart Immigration Care

<div align="center">

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**A comprehensive healthcare management system for migrant workers**

 • [Report Bug](https://github.com/Abhay-Nair/SIC/issues) • [Request Feature](https://github.com/Abhay-Nair/SIC/issues)

</div>

---

## 📋 Table of Contents

- [About The Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## 🎯 About The Project

**Smart Immigration Care (SIC)** is a comprehensive healthcare management platform designed to streamline medical services for migrant workers. The system provides role-based access for different stakeholders including migrants, doctors, health administrators, and government officials.

### Problem Statement
Migrant workers often face challenges in accessing healthcare services, maintaining medical records, and getting timely approvals for treatments. SIC addresses these challenges by providing a centralized platform for healthcare management.

### Solution
A multi-role web application that enables:
- **Migrants**: Access medical records, upload reports, track approvals
- **Doctors**: Verify medical conditions, provide diagnoses
- **Health Admins**: Manage healthcare facilities and resources
- **Officials**: Process approvals and monitor healthcare delivery
- **Authorities**: Oversee system operations and generate reports

## ✨ Features

### 🔐 Authentication & Authorization
- Secure role-based login system
- Multi-user type support (Migrant, Doctor, Health Admin, Official, Authority)
- Session management and access control

### 👤 Migrant Dashboard
- 📄 Upload and manage medical reports
- 📋 View medical history
- ✅ Track approval status
- 📊 Health profile management

### 👨‍⚕️ Doctor Dashboard
- 🔍 Review patient medical reports
- ✍️ Provide medical verification
- 📝 Add diagnoses and recommendations
- 📊 Patient management

### 🏥 Health Admin Dashboard
- 📈 Facility management
- 👥 Staff coordination
- 📊 Resource allocation
- 📋 Report generation

### 🏛️ Official Dashboard
- ✅ Process approval requests
- 📄 Review documentation
- 📊 Case management
- 🔔 Notification system

### 👮 Authority Dashboard
- 📊 System-wide analytics
- 📈 Performance monitoring
- 🔍 Audit trails
- 📋 Comprehensive reporting

## 🛠️ Tech Stack

**Backend:**
- **Flask** - Python web framework
- **SQLite** - Database
- **SQLAlchemy** - ORM (if used)
- **Werkzeug** - File handling and security

**Frontend:**
- **HTML5/CSS3** - Structure and styling
- **JavaScript** - Interactive functionality
- **Bootstrap** (if used) - Responsive design

**File Storage:**
- Local file system for document uploads
- Organized directory structure for different document types

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Abhay-Nair/SIC.git
   cd SIC
   ```

2. **Create a virtual environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the database**
   ```bash
   # The database will be created automatically on first run
   # Or run initialization script if available
   python backend/app.py
   ```

5. **Run the application**
   ```bash
   python backend/app.py
   ```

6. **Access the application**
   ```
   Open your browser and navigate to: http://localhost:5000
   ```

## 💻 Usage

### Default Login Credentials

For testing purposes, you can use these default credentials:

**Migrant User:**
- Username: `migrant_demo`
- Password: `demo123`

**Doctor:**
- Username: `doctor_demo`
- Password: `demo123`

**Official:**
- Username: `official_demo`
- Password: `demo123`

> ⚠️ **Note**: Change these credentials in production!

### Workflow

1. **Migrant uploads medical report** → 
2. **Doctor reviews and verifies** → 
3. **Official processes approval** → 
4. **Authority monitors and audits**

## 📁 Project Structure

```
SIC/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── config.py              # Configuration settings
│   ├── models.py              # Database models
│   ├── routes/                # Route handlers
│   │   └── ...
│   └── __pycache__/
├── static/
│   ├── authorities.js         # Authority dashboard logic
│   ├── doctor.js              # Doctor dashboard logic
│   ├── health_admin.js        # Health admin logic
│   ├── landing.js             # Landing page logic
│   ├── migrant.js             # Migrant dashboard logic
│   ├── official.js            # Official dashboard logic
│   └── style.css              # Global styles
├── templates/
│   ├── authorities_dashboard.html
│   ├── doctor_dashboard.html
│   ├── health_admin_dashboard.html
│   ├── landing.html
│   ├── login.html
│   ├── migrant_dashboard.html
│   └── official_dashboard.html
├── uploads/                   # Uploaded documents
│   ├── approval_letters/
│   ├── doctor_verifications/
│   ├── medical_reports/
│   └── official_verifications/
├── requirements.txt           # Python dependencies
├── .gitignore
└── README.md
```


## 🗺️ Roadmap

- [x] Multi-role authentication system
- [x] File upload and management
- [x] Role-based dashboards
- [ ] Email notifications
- [ ] SMS alerts for approvals
- [ ] Mobile responsive design improvements
- [ ] PDF report generation
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] API for mobile app integration

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

**Abhay Nair**

- GitHub: [@Abhay-Nair](https://github.com/Abhay-Nair)
- ORCID: [0009-0008-7719-4110](https://orcid.org/0009-0008-7719-4110)
- Project Link: [https://github.com/Abhay-Nair/SIC](https://github.com/Abhay-Nair/SIC)

## 🙏 Acknowledgments

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLite](https://www.sqlite.org/)
- [Font Awesome](https://fontawesome.com) (if used)
- [Bootstrap](https://getbootstrap.com) (if used)

---

<div align="center">

**Made with ❤️ for migrant healthcare**

⭐ Star this repo if you find it helpful!

</div>
