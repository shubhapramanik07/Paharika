// Navbar JavaScript codes
document.addEventListener("DOMContentLoaded", function () {
  let links = document.querySelectorAll(".nav-link");

  // Get the active page from localStorage
  let activePage = localStorage.getItem("activePage");

  links.forEach((link) => {
    // Check if the stored page matches the link href
    if (link.getAttribute("href") === activePage) {
      link.classList.add("active");
    }

    // Add click event to update active state
    link.addEventListener("click", function () {
      // Remove active class from all links
      links.forEach((l) => l.classList.remove("active"));

      // Add active class to clicked link
      this.classList.add("active");

      // Store the active link in localStorage
      localStorage.setItem("activePage", this.getAttribute("href"));
    });
  });
});

// Activate the current nav link
document.addEventListener("DOMContentLoaded", function () {
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    if (link.href === window.location.href) {
      link.classList.add("active");
    }
  });

  // Set minimum date to today for date inputs
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("startDate").min = today;
  document.getElementById("endDate").min = today;

  // Update end date min when start date changes
  document.getElementById("startDate").addEventListener("change", function () {
    document.getElementById("endDate").min = this.value;
  });
});

// Wait for the entire HTML document to be fully loaded and parsed
document.addEventListener("DOMContentLoaded", () => {
  const YOUR_API_KEY = "AIzaSyCCVBzor1Zj4vhQmDzi8G97SVqSse9PtHI";
  const MODEL_NAME = "gemini-1.5-flash";

  // --- DOM Element References ---
  const itineraryForm = document.getElementById("itineraryForm");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const itineraryResultDiv = document.getElementById("itineraryResult");
  const itineraryContent = document.getElementById("itineraryContent");
  const downloadBtn = document.getElementById("downloadBtn");

  // References for the "Other" destination functionality
  const otherCheckbox = document.getElementById("dest_other_chk");
  const otherTextInputWrapper = document.getElementById(
    "other_destination_wrapper"
  );
  const otherTextInput = document.getElementById("dest_other_text");

  // --- Basic SDK/Library Checks ---
  let googleAISDKLoaded = false;
  let pdfLibsLoaded = false;
  let markedLoaded = false;

  if (window.GoogleGenerativeAI) {
    console.log("Google AI SDK loaded.");
    googleAISDKLoaded = true;
  } else {
    console.error("GoogleGenerativeAI SDK not loaded!");
    alert(
      "Error: AI SDK failed to load. Please refresh the page or check the script tag."
    );
  }

  if (window.jspdf && window.html2canvas) {
    console.log("jsPDF and html2canvas loaded.");
    pdfLibsLoaded = true;
  } else {
    console.warn(
      "jsPDF or html2canvas not loaded! PDF download might be basic or unavailable."
    );
  }

  if (window.marked) {
    console.log("Marked library loaded.");
    markedLoaded = true;
  } else {
    console.warn(
      "Marked library not loaded. Markdown formatting might not render correctly."
    );
  }

  // --- Initialize Gemini AI (only if SDK loaded) ---
  let genAI;
  let model;
  if (googleAISDKLoaded && YOUR_API_KEY !== "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    try {
      const { GoogleGenerativeAI } = window;
      genAI = new GoogleGenerativeAI(YOUR_API_KEY);
      model = genAI.getGenerativeModel({ model: MODEL_NAME });
      console.log("Gemini AI Initialized and Ready.");
    } catch (error) {
      console.error("Error initializing GoogleGenerativeAI:", error);
      alert(
        "Failed to initialize the AI Model. Check API Key and console for details."
      );
      googleAISDKLoaded = false; // Prevent further API calls
    }
  } else if (YOUR_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
    alert("Please add your Gemini API Key to the script.js file.");
    console.error("API Key missing in script.js");
    googleAISDKLoaded = false;
  }

  // --- Logic for "Other" Destination Checkbox Visibility ---
  // (This runs immediately on page load to set up the interaction)
  if (otherCheckbox && otherTextInputWrapper && otherTextInput) {
    otherCheckbox.addEventListener("change", function () {
      if (this.checked) {
        otherTextInputWrapper.style.display = "block"; // Show the wrapper
        otherTextInput.disabled = false; // Enable the input
        otherTextInput.focus(); // Focus the input
      } else {
        otherTextInputWrapper.style.display = "none"; // Hide the wrapper
        otherTextInput.disabled = true; // Disable the input
        otherTextInput.value = ""; // Clear the value
      }
    });
    // Ensure initial state is correct based on page load (e.g., if checkbox was somehow pre-checked)
    if (!otherCheckbox.checked) {
      otherTextInputWrapper.style.display = "none";
      otherTextInput.disabled = true;
      otherTextInput.value = "";
    }
  } else {
    console.warn(
      "Could not find all 'Other' destination checkbox elements. This feature might not work."
    );
  }

  // --- Form Submission Handler ---
  if (itineraryForm) {
    itineraryForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent default page reload

      if (!googleAISDKLoaded || !model) {
        alert(
          "AI Model is not initialized. Cannot generate itinerary. Check API key and console."
        );
        return;
      }

      // 1. Show Loading, Hide Previous Results
      if (loadingSpinner) loadingSpinner.style.display = "inline-block";
      if (itineraryResultDiv) itineraryResultDiv.style.display = "none";
      if (itineraryContent) itineraryContent.innerHTML = ""; // Clear previous content

      try {
        // 2. Get User Inputs (using checkboxes)
        const selectedDestinations = [];
        const destinationCheckboxes = document.querySelectorAll(
          ".destination-chk:checked"
        );

        destinationCheckboxes.forEach((checkbox) => {
          selectedDestinations.push(checkbox.value);
        });

        // Check if "Other" is checked and has text
        if (
          otherCheckbox &&
          otherCheckbox.checked &&
          otherTextInput &&
          otherTextInput.value.trim() !== ""
        ) {
          selectedDestinations.push(otherTextInput.value.trim()); // Add the custom text
        }

        // Join the array into a string for the prompt
        const destinations =
          selectedDestinations.length > 0
            ? selectedDestinations.join(", ")
            : "Anywhere in North Bengal";

        // Get other form values
        const startDate = document.getElementById("startDate")?.value || ""; // Add safety check with ?
        const endDate = document.getElementById("endDate")?.value || "";
        const travelers =
          document.getElementById("travelers")?.value || "Unknown";
        const interest =
          document.getElementById("interest")?.value || "General";
        const specialRequests =
          document.getElementById("specialRequests")?.value.trim() || "None";

        // Basic Input Validation
        if (!startDate || !endDate || selectedDestinations.length === 0) {
          alert(
            "Please select at least one Destination and fill in Arrival/Departure Dates."
          );
          if (loadingSpinner) loadingSpinner.style.display = "none"; // Hide spinner on validation fail
          return;
        }
        // Optional: Date validation (End date should be after start date)
        if (new Date(endDate) < new Date(startDate)) {
          alert("Departure Date must be after Arrival Date.");
          if (loadingSpinner) loadingSpinner.style.display = "none";
          return;
        }

        // 3. Construct the Prompt for Gemini
        const prompt = `
                Create a personalized travel itinerary for North Bengal, India based on the following details:

                Destinations: ${destinations}
                Arrival Date: ${startDate}
                Departure Date: ${endDate}
                Number of Travelers: ${travelers}
                Main Interest: ${interest}
                Special Requests/Notes: ${specialRequests}

                Please provide a detailed day-by-day plan. Include suggestions for activities, sightseeing spots relevant to the interest(s) and selected destination(s). If multiple destinations are chosen or implied (like 'General North Bengal'), suggest a logical route or order. Mention potential travel times between key places if applicable. Format the output clearly using Markdown (e.g., ## Day 1: [Date], ### Morning/Afternoon/Evening, *Activity*). Be realistic about travel times. If dates are far in the past, generate a plan assuming the current year. Today's date is ${new Date().toLocaleDateString()}.
                `;

        console.log("Sending prompt to Gemini:", prompt);

        // 4. Call the Gemini API
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = await response.text();

        console.log("Received response from Gemini:", text);

        // 5. Display the Result
        if (itineraryContent) {
          if (markedLoaded && window.marked) {
            // Use marked to render Markdown - consider adding a sanitizer if needed for security
            itineraryContent.innerHTML = marked.parse(text);
          } else {
            // Basic display: replace newlines with <br> for readability
            itineraryContent.innerHTML = text.replace(/\n/g, "<br>");
          }
          if (itineraryResultDiv) itineraryResultDiv.style.display = "block"; // Show the result section
        } else {
          console.error("Itinerary content display area not found!");
        }
      } catch (error) {
        console.error("Error during itinerary generation:", error);
        if (itineraryContent) {
          itineraryContent.innerHTML = `<p class="text-danger">Sorry, an error occurred while generating the itinerary. Please check the console (F12) for details or try again later. Error: ${
            error.message || error
          }</p>`;
          if (itineraryResultDiv) itineraryResultDiv.style.display = "block"; // Show error message
        }
      } finally {
        // 6. Hide Loading Spinner
        if (loadingSpinner) loadingSpinner.style.display = "none";
      }
    });
  } else {
    console.error("Itinerary form not found! Submission handler not attached.");
  }

  // --- PDF Download Handler ---
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (!pdfLibsLoaded || !window.jspdf || !window.html2canvas) {
        alert(
          "PDF generation libraries (jsPDF, html2canvas) not loaded correctly. Cannot generate high-quality PDF."
        );
        // Optional: Add fallback to basic text PDF here if desired
        return;
      }
      if (!itineraryContent || !itineraryContent.innerHTML.trim()) {
        alert("Please generate an itinerary first before downloading!");
        return;
      }

      const { jsPDF } = window.jspdf;
      const elementToCapture = itineraryContent; // The div holding the generated content
      const filename = `NorthBengal_Itinerary_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`; // Add date to filename

      console.log("Starting PDF generation...");
      // Add temporary padding for better capture appearance
      elementToCapture.style.padding = "20px";

      html2canvas(elementToCapture, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, // If content includes external images
        logging: false, // Reduce console noise from html2canvas
      })
        .then((canvas) => {
          console.log("Canvas created by html2canvas.");
          // Remove temporary padding after capture
          elementToCapture.style.padding = "";

          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4",
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 15; // Page margin in mm
          const usableWidth = pdfWidth - 2 * margin;
          const usableHeight = pdfHeight - 2 * margin;

          const imgProps = pdf.getImageProperties(imgData);
          const imgRatio = imgProps.height / imgProps.width;
          let imgWidth = usableWidth;
          let imgHeight = imgWidth * imgRatio;

          // Check if image height exceeds usable page height, if so scale by height
          if (imgHeight > usableHeight) {
            imgHeight = usableHeight;
            imgWidth = imgHeight / imgRatio;
          }

          let currentHeight = 0;
          const totalImageHeightInMM = imgHeight; // Use the scaled image height

          // Add first page
          pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
          currentHeight += totalImageHeightInMM; // Track how much height of the original image is rendered

          // This logic for multi-page is tricky with a single image capture.
          // A more robust approach involves capturing sections or using jsPDF's HTML rendering,
          // but for a single long image capture, this adds pages *if the scaled image is taller than the page*.
          // It won't perfectly paginate HTML content across pages from a single image.

          // A simpler approach for now: if the content is very long, the PDF might just clip it or scale it down.
          // True HTML element pagination usually requires more complex libraries or manual section breaks.

          console.log("Saving PDF...");
          pdf.save(filename);
          console.log("PDF Saved.");
        })
        .catch((err) => {
          // Remove temporary padding in case of error too
          elementToCapture.style.padding = "";
          console.error("Error generating PDF with html2canvas:", err);
          alert("Could not generate PDF. Check console for errors.");
        });
    });
  } else {
    console.warn(
      "Download button not found! PDF download handler not attached."
    );
  }
}); // End DOMContentLoaded

// todo Weather API Integration

document.addEventListener("DOMContentLoaded", function () {
  const weatherAlertsDiv = document.querySelector(
    ".weather-alerts .weather-alerts-content"
  );
  const apiKey = "cc4d0bf714313b765a5f8e314d1f81d5";
  const cities = [
    { name: "Darjeeling", countryCode: "IN" },
    { name: "Kalimpong", countryCode: "IN" },
    { name: "Gangtok", countryCode: "IN" },
  ];

  let allWeatherInfoHTML = "";

  cities.forEach((cityData) => {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityData.name},${cityData.countryCode}&appid=${apiKey}&units=metric`;

    fetch(apiUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP error! status: ${response.status} for ${cityData.name}`
          );
        }
        return response.json();
      })
      .then((data) => {
        let cityWeatherHTML = "<div>"; // Start a div for each city
        if (data && data.weather && data.weather.length > 0) {
          const description = data.weather[0].description;
          const timestamp = data.dt;
          const dateTime = new Date(timestamp * 1000);
          const hours = dateTime.getHours();
          const minutes = dateTime.getMinutes().toString().padStart(2, "0");
          const formattedTime = `${hours}:${minutes}`;

          cityWeatherHTML += `<h4>Weather in ${cityData.name} at <span class="time">${formattedTime}</span>:</h4><p>${description}</p>`;
        } else {
          cityWeatherHTML += `<p>No weather description available for ${cityData.name}.</p>`;
        }
        cityWeatherHTML += "</div><hr>"; // Close the div and add a separator
        allWeatherInfoHTML += cityWeatherHTML;
      })
      .catch((error) => {
        console.error(
          `Error fetching weather data for ${cityData.name}:`,
          error
        );
        allWeatherInfoHTML += `<div><p>Failed to fetch weather data for ${cityData.name}.</p></div><hr>`;
      })
      .finally(() => {
        if (cities.indexOf(cityData) === cities.length - 1) {
          weatherAlertsDiv.innerHTML =
            allWeatherInfoHTML || "<p>No weather information available.</p>";
        }
        console.log(cityData);
      });
  });
});














