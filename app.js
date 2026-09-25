const API = "http://localhost:5001/api";


/* =====================================================
   PAGE NAVIGATION
===================================================== */

function showPage(pageId) {

    // Hide all pages
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    // Remove active from navigation
    document.querySelectorAll(".nav").forEach(button => {
        button.classList.remove("active");
    });

    // Show selected page
    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }

    // Active navigation button
    const selectedNav = document.querySelector(
        `.nav[data-target="${pageId}"]`
    );

    if (selectedNav) {
        selectedNav.classList.add("active");
    }

    // Change title
    const pageTitle = document.getElementById("pageTitle");

    const titles = {
        dashboard: "Medication Safety Dashboard",
        checker: "Prescription Safety Checker",
        medications: "Medication Library",
        patients: "Patient Checks"
    };

    if (pageTitle) {
        pageTitle.textContent =
            titles[pageId] || "MediShield";
    }


    // Load page data
    if (pageId === "dashboard") {
        loadDashboard();
    }

    if (pageId === "medications") {
        loadMedications();
    }

    if (pageId === "patients") {
        loadPatients();
    }
}


/*
   VERY IMPORTANT
   Allows HTML onclick="showPage(...)"
   to access this function.
*/

window.showPage = showPage;


/* =====================================================
   NAVIGATION BUTTONS
===================================================== */

document.querySelectorAll("[data-target]").forEach(button => {

    button.addEventListener("click", function () {

        const target =
            this.getAttribute("data-target");

        if (target) {
            showPage(target);
        }

    });

});


/* =====================================================
   API HELPER
===================================================== */

async function apiRequest(endpoint, options = {}) {

    try {

        const response = await fetch(
            API + endpoint,
            {
                headers: {
                    "Content-Type": "application/json"
                },
                ...options
            }
        );


        if (!response.ok) {

            let errorMessage =
                "Something went wrong.";

            try {

                const errorData =
                    await response.json();

                errorMessage =
                    errorData.error ||
                    errorMessage;

            } catch (error) {}

            throw new Error(errorMessage);
        }


        return await response.json();

    } catch (error) {

        console.error(
            "API Error:",
            error
        );

        throw error;
    }
}


/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {

    try {

        const data =
            await apiRequest("/dashboard");


        const patients =
            document.getElementById("sPatients");

        const prescriptions =
            document.getElementById("sRx");

        const highAlerts =
            document.getElementById("sHigh");

        const mediumAlerts =
            document.getElementById("sMedium");


        if (patients) {
            patients.textContent =
                data.patients;
        }

        if (prescriptions) {
            prescriptions.textContent =
                data.prescriptions;
        }

        if (highAlerts) {
            highAlerts.textContent =
                data.highAlerts;
        }

        if (mediumAlerts) {
            mediumAlerts.textContent =
                data.mediumAlerts;
        }


        displayRecentAlerts(
            data.recentAlerts || []
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }
}


/* =====================================================
   RECENT ALERTS
===================================================== */

function displayRecentAlerts(alerts) {

    const container =
        document.getElementById(
            "recentAlerts"
        );


    if (!container) return;


    if (alerts.length === 0) {

        container.innerHTML = `
            <div class="empty-result">
                No safety alerts yet.
            </div>
        `;

        return;
    }


    container.innerHTML =
        alerts.map(alert => {

            return `

                <div class="alert">

                    <div>

                        <strong>
                            ${escapeHTML(
                                alert.patientName
                            )}
                        </strong>

                        <br>

                        <small>
                            ${escapeHTML(
                                alert.message
                            )}
                        </small>

                    </div>

                    <span class="badge ${alert.severity}">
                        ${escapeHTML(
                            alert.severity
                        )}
                    </span>

                </div>

            `;

        }).join("");
}


/* =====================================================
   MEDICATION LIBRARY
===================================================== */

async function loadMedications() {

    const grid =
        document.getElementById(
            "drugGrid"
        );


    if (!grid) return;


    grid.innerHTML = `
        <div class="empty-result">
            Loading medications...
        </div>
    `;


    try {

        const medicines =
            await apiRequest(
                "/medications"
            );


        if (!medicines.length) {

            grid.innerHTML = `
                <div class="empty-result">
                    No medications found.
                </div>
            `;

            return;
        }


        grid.innerHTML =
            medicines.map(medicine => {

                return `

                    <div class="drug">

                        <span class="pill">
                            ${escapeHTML(
                                medicine.class
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                medicine.name
                            )}
                        </h3>

                        <p>
                            Strength:
                            <strong>
                                ${escapeHTML(
                                    medicine.strength
                                )}
                            </strong>
                        </p>

                        <p>
                            Maximum demo dose:
                            <strong>
                                ${medicine.maxDailyMg} mg/day
                            </strong>
                        </p>

                    </div>

                `;

            }).join("");


    } catch (error) {

        grid.innerHTML = `
            <div class="empty-result">
                ❌ Unable to load medication library.
            </div>
        `;

    }
}


/* =====================================================
   PATIENTS
===================================================== */

async function loadPatients() {

    const table =
        document.getElementById(
            "patientTable"
        );


    if (!table) return;


    table.innerHTML = `
        <tr>
            <td colspan="5">
                Loading patient records...
            </td>
        </tr>
    `;


    try {

        const patients =
            await apiRequest(
                "/patients"
            );


        if (patients.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        No patient records yet.
                    </td>
                </tr>
            `;

            return;
        }


        table.innerHTML =
            patients
                .slice()
                .reverse()
                .map(patient => {

                    const medicationNames =
                        patient.medications
                            .map(medicine => {

                                return (
                                    medicine.drugName ||
                                    medicine.drugId
                                );

                            })
                            .join(", ");


                    const importantAlerts =
                        patient.alerts.filter(
                            alert =>
                                alert.severity !==
                                "low"
                        ).length;


                    let alertHTML;


                    if (importantAlerts > 0) {

                        alertHTML = `
                            <span class="badge high">
                                ${importantAlerts}
                                alert(s)
                            </span>
                        `;

                    } else {

                        alertHTML = `
                            <span class="badge low">
                                Clear
                            </span>
                        `;

                    }


                    return `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        patient.patient.name
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${
                                    patient.patient.age ||
                                    "—"
                                }
                            </td>

                            <td>
                                ${escapeHTML(
                                    medicationNames
                                )}
                            </td>

                            <td>
                                ${alertHTML}
                            </td>

                            <td>
                                ${new Date(
                                    patient.createdAt
                                ).toLocaleString()}
                            </td>

                        </tr>

                    `;

                })
                .join("");


    } catch (error) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    ❌ Unable to load patient records.
                </td>
            </tr>
        `;

    }
}


/* =====================================================
   MEDICATION OPTIONS
===================================================== */

async function getMedicationOptions() {

    const medicines =
        await apiRequest(
            "/medications"
        );


    return medicines.map(medicine => {

        return `

            <option value="${medicine.id}">

                ${escapeHTML(
                    medicine.name
                )}

                -
                ${escapeHTML(
                    medicine.strength
                )}

            </option>

        `;

    }).join("");
}


/* =====================================================
   ADD MEDICATION ROW
===================================================== */

async function addMedication() {

    const container =
        document.getElementById(
            "medRows"
        );


    if (!container) return;


    try {

        const options =
            await getMedicationOptions();


        const row =
            document.createElement("div");


        row.className =
            "med-row";


        row.innerHTML = `

            <select class="drug">

                ${options}

            </select>


            <input
                class="dose"
                type="number"
                min="1"
                value="500"
                placeholder="Dose mg"
            >


            <input
                class="freq"
                type="number"
                min="1"
                max="8"
                value="1"
                placeholder="Times/day"
            >


            <button
                type="button"
                class="remove">

                ×

            </button>

        `;


        const removeButton =
            row.querySelector(
                ".remove"
            );


        removeButton.addEventListener(
            "click",
            function () {

                row.remove();

            }
        );


        container.appendChild(row);


    } catch (error) {

        console.error(
            "Medication loading error:",
            error
        );

    }
}


/* =====================================================
   ADD MEDICATION BUTTON
===================================================== */

const addMedicationButton =
    document.getElementById(
        "addMed"
    );


if (addMedicationButton) {

    addMedicationButton.addEventListener(
        "click",
        addMedication
    );

}


/* =====================================================
   PRESCRIPTION FORM
===================================================== */

const prescriptionForm =
    document.getElementById(
        "checkForm"
    );


if (prescriptionForm) {

    prescriptionForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* Patient name */

            const patientName =
                document.getElementById(
                    "patientName"
                ).value.trim();


            /* Age */

            const patientAge =
                Number(
                    document.getElementById(
                        "patientAge"
                    ).value
                ) || null;


            /* Allergies */

            const allergyText =
                document.getElementById(
                    "allergies"
                ).value;


            const allergies =
                allergyText
                    .split(",")
                    .map(
                        allergy =>
                            allergy.trim()
                    )
                    .filter(Boolean);


            /* Medication rows */

            const rows =
                document.querySelectorAll(
                    ".med-row"
                );


            /* Validate patient */

            if (!patientName) {

                alert(
                    "Please enter patient name."
                );

                return;
            }


            /* Validate medication */

            if (rows.length === 0) {

                alert(
                    "Please add at least one medication."
                );

                return;
            }


            /* Create medication array */

            const medicines =
                [...rows].map(row => {

                    const select =
                        row.querySelector(
                            ".drug"
                        );


                    const selectedOption =
                        select.options[
                            select.selectedIndex
                        ];


                    const dose =
                        Number(
                            row.querySelector(
                                ".dose"
                            ).value
                        );


                    const frequency =
                        Number(
                            row.querySelector(
                                ".freq"
                            ).value
                        );


                    return {

                        drugId:
                            select.value,

                        drugName:
                            selectedOption
                                .textContent
                                .split(" - ")[0]
                                .trim(),

                        doseMg:
                            dose,

                        frequencyPerDay:
                            frequency

                    };

                });


            /* Result box */

            const resultBox =
                document.getElementById(
                    "resultBox"
                );


            resultBox.innerHTML = `

                <div class="empty-result">

                    🔄 Checking prescription...

                </div>

            `;


            /* Disable button */

            const submitButton =
                prescriptionForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Checking...";

            }


            try {

                /* Send data to backend */

                const result =
                    await apiRequest(
                        "/check",
                        {

                            method: "POST",

                            body:
                                JSON.stringify({

                                    patient: {

                                        name:
                                            patientName,

                                        age:
                                            patientAge

                                    },

                                    allergies:
                                        allergies,

                                    medications:
                                        medicines

                                })

                        }
                    );


                /* Show result */

                showSafetyResult(
                    result
                );


                /* Refresh dashboard */
                await loadDashboard();
                await loadPatients();


            } catch (error) {

                console.error(
                    error
                );


                resultBox.innerHTML = `

                    <div class="empty-result">

                        ❌
                        ${escapeHTML(
                            error.message
                        )}

                    </div>

                `;

            } finally {

                if (submitButton) {

                    submitButton.disabled =
                        false;

                    submitButton.textContent =
                        "Run safety check";

                }

            }

        }
    );

}


/* =====================================================
   SAFETY RESULT
===================================================== */

    function showSafetyResult(result) {

    const resultBox = document.getElementById("resultBox");
    const resultSub = document.getElementById("resultSub");

    if (!resultBox) return;

    const patientName =
        document.getElementById("patientName")?.value.trim() ||
        "Patient";

    const patientAge =
        document.getElementById("patientAge")?.value ||
        "Not provided";

    const allergies =
        document.getElementById("allergies")?.value.trim() ||
        "None reported";


    /* ================================
       GET MEDICINES
    ================================= */

    const rows =
        document.querySelectorAll(".med-row");

    let medicineRows = "";

    rows.forEach((row, index) => {

        const drugSelect =
            row.querySelector(".drug");

        const medicineName =
            drugSelect?.options[
                drugSelect.selectedIndex
            ]?.textContent.trim() ||
            "Medicine";

        const dose =
            row.querySelector(".dose")?.value ||
            "—";

        const frequency =
            row.querySelector(".freq")?.value ||
            "—";


        medicineRows += `

            <tr>

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(medicineName)}
                </td>

                <td>
                    ${escapeHTML(dose)} mg
                </td>

                <td>
                    ${escapeHTML(frequency)}
                    time(s)/day
                </td>

            </tr>

        `;
    });


    /* ================================
       SAFETY ALERTS
    ================================= */

    const alerts =
        result.alerts || [];


    if (resultSub) {

        resultSub.textContent =
            alerts.length === 0
                ? "Prescription checked successfully"
                : `${alerts.length} safety finding(s) detected`;

    }


    let safetySection = "";


    if (alerts.length === 0) {

        safetySection = `

            <div class="prescription-safe">

                <div class="safe-icon">
                    ✓
                </div>

                <div>

                    <strong>
                        Prescription Safety Check Passed
                    </strong>

                    <p>
                        No configured safety alerts
                        were detected.
                    </p>

                </div>

            </div>

        `;

    } else {

        safetySection = `

            <div class="prescription-alerts">

                <h4>
                    ⚠ Safety Findings
                </h4>

                ${alerts.map(alert => `

                    <div class="prescription-alert">

                        <span class="badge ${escapeHTML(alert.severity)}">

                            ${escapeHTML(
                                alert.severity
                            )}

                        </span>

                        <span>

                            ${escapeHTML(
                                alert.message
                            )}

                        </span>

                    </div>

                `).join("")}

            </div>

        `;
    }


    /* ================================
       PRESCRIPTION DOCUMENT
    ================================= */

    resultBox.innerHTML = `

        <div
            id="prescriptionDocument"
            class="prescription-document">


            <!-- HEADER -->

            <div class="prescription-header">

                <div>

                    <h2>
                        MediShield
                    </h2>

                    <p>
                        Smart Medication Safety System
                    </p>

                </div>


                <div class="prescription-label">

                    PRESCRIPTION REVIEW

                </div>

            </div>


            <hr>


            <!-- PATIENT INFORMATION -->

            <div class="prescription-patient">


                <div>

                    <span>
                        Patient Name
                    </span>

                    <strong>
                        ${escapeHTML(patientName)}
                    </strong>

                </div>


                <div>

                    <span>
                        Age
                    </span>

                    <strong>
                        ${escapeHTML(patientAge)}
                    </strong>

                </div>


                <div>

                    <span>
                        Allergies
                    </span>

                    <strong>
                        ${escapeHTML(allergies)}
                    </strong>

                </div>


            </div>


            <!-- MEDICINES -->

            <h3 class="prescription-heading">

                Prescription Details

            </h3>


            <table class="prescription-table">

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        <th>
                            Medicine
                        </th>

                        <th>
                            Dose
                        </th>

                        <th>
                            Frequency
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${medicineRows}

                </tbody>

            </table>


            <!-- SAFETY RESULT -->

            ${safetySection}


            <!-- FOOTER -->

            <div class="prescription-footer">


                <div>

                    <strong>
                        Safety Check Date
                    </strong>

                    <br>

                    ${new Date().toLocaleString()}

                </div>


                <div class="signature-box">

                    ______________________

                    <br>

                    Reviewer / Clinician

                </div>


            </div>


            <!-- DISCLAIMER -->

            <div class="prescription-disclaimer">

                <strong>
                    Important:
                </strong>

                This is a medication-safety demo result.
                It does not replace a licensed doctor,
                pharmacist, official prescribing information,
                or professional medical advice.

            </div>


        </div>


        <!-- ACTION BUTTONS -->

        <div class="prescription-actions">


            <button
                type="button"
                class="primary"
                onclick="printPrescription()">

                🖨 Print Prescription

            </button>


            <button
                type="button"
                class="secondary"
                onclick="downloadPrescription()">

                📄 Save Prescription

            </button>


        </div>

    `;
}




/* =====================================================
   SAVE PRESCRIPTION
===================================================== */

function downloadPrescription() {

    const prescription =
        document.getElementById(
            "printPrescriptionDocument"
        );


    if (!prescription) {

        alert(
            "Please run the safety check first."
        );

        return;
    }


    const text =
        prescription.innerText;


    const blob =
        new Blob(
            [text],
            {
                type: "text/plain"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        "MediShield-Prescription.txt";


    link.click();


    URL.revokeObjectURL(url);

}

/* =====================================================
   HTML SECURITY
===================================================== */

function escapeHTML(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        function (character) {

            const characters = {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            };

            return characters[
                character
            ];

        }
    );
}


/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

async function startApplication() {

    console.log(
        "MediShield frontend started"
    );


    /* Load first medication */

    const medRows =
        document.getElementById(
            "medRows"
        );


    if (
        medRows &&
        medRows.children.length === 0
    ) {

        await addMedication();

    }


    /* Load dashboard */

    await loadDashboard();

}


/* Start */

startApplication();
/* =====================================================
   CLEAR ALL PATIENT RECORDS
===================================================== */

const clearPatientsButton =
    document.getElementById("clearPatients");

if (clearPatientsButton) {

    clearPatientsButton.addEventListener(
        "click",
        async function () {

            const confirmDelete =
                confirm(
                    "Are you sure you want to delete ALL patient records?"
                );

            if (!confirmDelete) {
                return;
            }

            try {

                const response =
                    await fetch(
                        API + "/patients",
                        {
                            method: "DELETE"
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        "Unable to clear records."
                    );
                }

                alert(
                    "✅ All patient records have been cleared."
                );

                await loadPatients();
                await loadDashboard();

            } catch (error) {

                console.error(error);

                alert(
                    "❌ " + error.message
                );

            }

        }
    );
}
