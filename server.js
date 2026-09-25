const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Data folder
const dataFolder = path.join(__dirname, "data");
const patientsFile = path.join(dataFolder, "patients.json");

// Create data folder
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

// Create patients.json
if (!fs.existsSync(patientsFile)) {
    fs.writeFileSync(patientsFile, "[]");
}

// Read patients
function getPatients() {
    try {
        return JSON.parse(
            fs.readFileSync(patientsFile, "utf8")
        );
    } catch (error) {
        return [];
    }
}

// Save patients
function savePatients(patients) {
    fs.writeFileSync(
        patientsFile,
        JSON.stringify(patients, null, 2)
    );
}


/* ==========================================
   MEDICATION DATABASE
   ========================================== */

const medications = [
    {
        id: "paracetamol",
        name: "Paracetamol",
        class: "Pain Killer",
        strength: "500 mg",
        maxDailyMg: 4000
    },

    {
        id: "ibuprofen",
        name: "Ibuprofen",
        class: "NSAID",
        strength: "400 mg",
        maxDailyMg: 1200
    },

    {
        id: "amoxicillin",
        name: "Amoxicillin",
        class: "Antibiotic",
        strength: "500 mg",
        maxDailyMg: 3000
    },

    {
        id: "azithromycin",
        name: "Azithromycin",
        class: "Antibiotic",
        strength: "500 mg",
        maxDailyMg: 500
    },

    {
        id: "metformin",
        name: "Metformin",
        class: "Antidiabetic",
        strength: "500 mg",
        maxDailyMg: 2000
    },

    {
        id: "amlodipine",
        name: "Amlodipine",
        class: "Blood Pressure",
        strength: "5 mg",
        maxDailyMg: 10
    },

    {
        id: "cetirizine",
        name: "Cetirizine",
        class: "Antihistamine",
        strength: "10 mg",
        maxDailyMg: 10
    },

    {
        id: "omeprazole",
        name: "Omeprazole",
        class: "Acidity",
        strength: "20 mg",
        maxDailyMg: 40
    }
];


/* ==========================================
   HOME / HEALTH CHECK
   ========================================== */

app.get("/", (req, res) => {

    res.json({
        message: "MediShield Backend is running!",
        status: "success"
    });

});


/* ==========================================
   HEALTH API
   ========================================== */

app.get("/api/health", (req, res) => {

    res.json({
        status: "OK",
        message: "MediShield backend is working"
    });

});


/* ==========================================
   GET MEDICATIONS
   ========================================== */

app.get("/api/medications", (req, res) => {

    res.json(medications);

});


/* ==========================================
   GET PATIENTS
   ========================================== */

app.get("/api/patients", (req, res) => {


    const patients = getPatients();

    res.json(patients);


});
// DELETE ALL PATIENT RECORDS
app.delete("/api/patients", (req, res) => {

    try {

        // Empty patient records
        savePatients([]);

        res.json({
            success: true,
            message: "All patient records deleted successfully"
        });

    } catch (error) {

        console.error(
            "Delete patients error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Failed to delete patient records"
        });

    }

});


/* ==========================================
   PRESCRIPTION CHECKER
   ========================================== */

app.post("/api/check", (req, res) => {

    const {
        patient,
        allergies = [],
        medications: prescribed = []
    } = req.body;


    if (!patient || !patient.name) {

        return res.status(400).json({
            error: "Patient name is required"
        });

    }


    if (prescribed.length === 0) {

        return res.status(400).json({
            error: "Please add at least one medicine"
        });

    }


    const alerts = [];


    /* ======================================
       CHECK EACH MEDICINE
       ====================================== */

    prescribed.forEach((medicine) => {

        const drug = medications.find(
            item => item.id === medicine.drugId
        );


        if (!drug) {

            alerts.push({

                severity: "high",

                type: "unknown",

                message:
                    `${medicine.drugName} is not available in the medication database.`

            });

            return;

        }


        const dose =
            Number(medicine.doseMg) || 0;

        const frequency =
            Number(medicine.frequencyPerDay) || 1;


        const dailyDose =
            dose * frequency;


        /* Dose check */

        if (dailyDose > drug.maxDailyMg) {

            alerts.push({

                severity: "high",

                type: "dose",

                message:
                    `${drug.name}: daily dose ${dailyDose} mg exceeds the demo threshold of ${drug.maxDailyMg} mg/day.`

            });

        } else {

            alerts.push({

                severity: "low",

                type: "dose",

                message:
                    `${drug.name}: dose is within the configured demo threshold.`

            });

        }


        /* Allergy check */

        allergies.forEach((allergy) => {

            const allergyName =
                allergy.toLowerCase().trim();


            if (
                allergyName === "penicillin" &&
                drug.id === "amoxicillin"
            ) {

                alerts.push({

                    severity: "high",

                    type: "allergy",

                    message:
                        `Potential allergy conflict: patient reports Penicillin allergy and Amoxicillin is prescribed.`

                });

            }


            if (
                allergyName === "ibuprofen" &&
                drug.id === "ibuprofen"
            ) {

                alerts.push({

                    severity: "high",

                    type: "allergy",

                    message:
                        `Potential allergy conflict: patient reports Ibuprofen allergy.`

                });

            }

        });

    });


    /* ======================================
       SIMPLE INTERACTION CHECK
       ====================================== */

    const drugIds =
        prescribed.map(
            medicine => medicine.drugId
        );


    if (
        drugIds.includes("amoxicillin") &&
        drugIds.includes("azithromycin")
    ) {

        alerts.push({

            severity: "medium",

            type: "interaction",

            message:
                "Multiple antibiotics detected. Verify that combined antibiotic therapy is clinically intended."

        });

    }


    if (
        drugIds.filter(
            id => id === "ibuprofen"
        ).length > 1
    ) {

        alerts.push({

            severity: "medium",

            type: "interaction",

            message:
                "Duplicate Ibuprofen therapy detected."

        });

    }


    /* ======================================
       SAVE RECORD
       ====================================== */

    const patients = getPatients();


    const record = {

        id: Date.now().toString(),

        patient: {

            name: patient.name,

            age: patient.age || null

        },

        allergies,

        medications: prescribed,

        alerts,

        createdAt:
            new Date().toISOString()

    };


    patients.push(record);

    savePatients(patients);


    /* ======================================
       SEND RESULT
       ====================================== */

    res.json({

        success: true,

        patient: record.patient,

        alerts,

        checkedAt:
            record.createdAt

    });

});


/* ==========================================
   DASHBOARD
   ========================================== */

app.get("/api/dashboard", (req, res) => {

    const patients = getPatients();


    let highAlerts = 0;
    let mediumAlerts = 0;
    let totalAlerts = 0;


    patients.forEach(patient => {

        patient.alerts.forEach(alert => {

            totalAlerts++;


            if (alert.severity === "high") {
                highAlerts++;
            }


            if (alert.severity === "medium") {
                mediumAlerts++;
            }

        });

    });


    const recentAlerts = [];


    patients
        .slice()
        .reverse()
        .forEach(patient => {

            patient.alerts
                .filter(
                    alert =>
                        alert.severity !== "low"
                )
                .forEach(alert => {

                    recentAlerts.push({

                        patientName:
                            patient.patient.name,

                        severity:
                            alert.severity,

                        message:
                            alert.message,

                        createdAt:
                            patient.createdAt

                    });

                });

        });


    res.json({

        patients:
            patients.length,

        prescriptions:
            patients.length,

        totalAlerts,

        highAlerts,

        mediumAlerts,

        recentAlerts:
            recentAlerts.slice(0, 10)

    });

});


/* ==========================================
   START SERVER
   ========================================== */

app.listen(PORT, () => {

    console.log("");
    console.log("=================================");
    console.log("      MEDISHIELD BACKEND");
    console.log("=================================");
    console.log(
        `Server running on http://localhost:${PORT}`
    );
    console.log(
        `Health check: http://localhost:${PORT}/api/health`
    );
    console.log(
        "=================================");
    console.log("");

});