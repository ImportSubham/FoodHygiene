// --- 1. CONFIGURATION ---
const firebaseConfig = {
    // PASTE YOUR FIREBASE CONFIG OBJECT HERE FROM FIREBASE CONSOLE
    apiKey: "AIzaSyB5MbVsFWVUalGVA5VPS0-Nkvs9ZSeF5bk",
    authDomain: "foodhygiene-5dcb4.firebaseapp.com",
    projectId: "foodhygiene-5dcb4",
    storageBucket: "foodhygiene-5dcb4.firebasestorage.app",
    messagingSenderId: "615573792166",
    appId: "1:615573792166:web:85c2ee0ecc6503f3e61b67"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// State
let currentUser = null;

// --- 2. AUTHENTICATION LOGIC ---

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('authLinks').classList.add('hidden');
        document.getElementById('userProfile').classList.remove('hidden');
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('addStallBtn').style.display = 'inline-block';
        // Show Seed Button for demo purposes if logged in
        document.getElementById('seedDataBtn').style.display = 'inline-block';
    } else {
        currentUser = null;
        document.getElementById('authLinks').classList.remove('hidden');
        document.getElementById('userProfile').classList.add('hidden');
        document.getElementById('addStallBtn').style.display = 'none';
        document.getElementById('seedDataBtn').style.display = 'none';
    }
});

function registerUser() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    
    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Account created!");
            closeModal('registerModal');
        })
        .catch(error => alert(error.message));
}

function loginUser() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPass').value;
    
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            closeModal('loginModal');
        })
        .catch(error => alert(error.message));
}

function logout() {
    auth.signOut();
}

// --- 3. CORE LOGIC (STALLS & RATINGS) ---

// Fetch and Render Stalls
function loadStalls(filterCity = "") {
    const stallList = document.getElementById('stallList');
    stallList.innerHTML = '<div class="loading">Updating leaderboard...</div>';

    let query = db.collection("stalls").orderBy("overallScore", "desc");
    
    // Note: Simple client-side filtering for demo. 
    // For production, use Firestore "where" clauses (requires composite indexes).

    query.get().then((querySnapshot) => {
        stallList.innerHTML = "";
        let stalls = [];
        
        querySnapshot.forEach((doc) => {
            stalls.push({ id: doc.id, ...doc.data() });
        });

        if(filterCity) {
            const term = filterCity.toLowerCase();
            stalls = stalls.filter(s => 
                s.city.toLowerCase().includes(term) || 
                s.locality.toLowerCase().includes(term) ||
                s.name.toLowerCase().includes(term)
            );
        }

        if(stalls.length === 0) {
            stallList.innerHTML = "<p>No stalls found. Be the first to add one!</p>";
            return;
        }

        stalls.forEach(stall => {
            const card = createStallCard(stall);
            stallList.appendChild(card);
        });
    });
}

function createStallCard(stall) {
    const div = document.createElement('div');
    div.className = 'stall-card';
    
    // Determine color based on score
    let scoreColor = '#e74c3c'; // red
    if(stall.overallScore >= 4) scoreColor = '#27ae60'; // green
    else if(stall.overallScore >= 2.5) scoreColor = '#f39c12'; // orange

    div.innerHTML = `
        <img src="${stall.image}" class="stall-img" alt="${stall.name}">
        <div class="stall-info">
            <div class="stall-header">
                <div>
                    <h3 class="stall-name">${stall.name}</h3>
                    <p class="stall-loc"><i class="fas fa-map-marker-alt"></i> ${stall.locality}, ${stall.city}</p>
                </div>
                <div class="score-badge" style="background:${scoreColor}">${stall.overallScore.toFixed(1)}</div>
            </div>
            
            <div class="score-details">
                <div><i class="fas fa-tint"></i> Water: ${stall.scores.water.toFixed(1)}</div>
                <div><i class="fas fa-head-side-mask"></i> Masks: ${stall.scores.masks.toFixed(1)}</div>
                <div><i class="fas fa-hands-wash"></i> Gloves: ${stall.scores.gloves.toFixed(1)}</div>
                <div><i class="fas fa-broom"></i> Clean: ${stall.scores.clean.toFixed(1)}</div>
            </div>

            <div class="card-actions">
                <button class="btn-primary" onclick="openRateModal('${stall.id}', '${stall.name}')">Rate & Review</button>
                <button class="btn-outline" onclick="generateQR('${stall.name}', ${stall.overallScore})"><i class="fas fa-qrcode"></i> Owner QR</button>
            </div>
            <p style="font-size:0.8rem; color:#888; margin-top:10px;">${stall.reviewCount} Reviews</p>
        </div>
    `;
    return div;
}

// Add New Stall
function addNewStall() {
    if(!currentUser) { alert("Please login first."); return; }

    const name = document.getElementById('stallName').value;
    const city = document.getElementById('stallCity').value;
    const locality = document.getElementById('stallLocality').value;
    // Note: For real photo upload, we'd use Firebase Storage. 
    // Here we assign a random food image for the demo.
    const randomImage = `https://source.unsplash.com/400x300/?streetfood,${Math.floor(Math.random()*100)}`;

    if(!name || !city) return alert("Fill required fields");

    db.collection("stalls").add({
        name: name,
        city: city,
        locality: locality,
        image: randomImage,
        reviewCount: 0,
        overallScore: 0,
        scores: { water:0, masks:0, gloves:0, clean:0 }
    }).then(() => {
        alert("Stall Added!");
        closeModal('addStallModal');
        loadStalls();
    });
}

// Rating Logic
function openRateModal(id, name) {
    if(!currentUser) { alert("Please login to rate."); openModal('loginModal'); return; }
    document.getElementById('ratingStallId').value = id;
    document.getElementById('ratingStallName').innerText = "Rate " + name;
    openModal('rateModal');
}

function submitReview() {
    const stallId = document.getElementById('ratingStallId').value;
    const w = parseInt(document.getElementById('rateWater').value);
    const m = parseInt(document.getElementById('rateMasks').value);
    const g = parseInt(document.getElementById('rateGloves').value);
    const c = parseInt(document.getElementById('rateClean').value);
    const comment = document.getElementById('rateComment').value;

    const newAvg = (w + m + g + c) / 4;

    // 1. Add Review to subcollection (optional) or just update stats
    // Ideally use a Firebase Transaction here for consistency
    const stallRef = db.collection("stalls").doc(stallId);

    db.runTransaction((transaction) => {
        return transaction.get(stallRef).then((sfDoc) => {
            if (!sfDoc.exists) throw "Document does not exist!";
            
            const data = sfDoc.data();
            const count = data.reviewCount;
            const oldScores = data.scores;

            // Calculate new rolling averages
            const newWater = ((oldScores.water * count) + w) / (count + 1);
            const newMasks = ((oldScores.masks * count) + m) / (count + 1);
            const newGloves = ((oldScores.gloves * count) + g) / (count + 1);
            const newClean = ((oldScores.clean * count) + c) / (count + 1);
            const newOverall = (newWater + newMasks + newGloves + newClean) / 4;

            transaction.update(stallRef, {
                reviewCount: count + 1,
                overallScore: newOverall,
                scores: {
                    water: newWater,
                    masks: newMasks,
                    gloves: newGloves,
                    clean: newClean
                }
            });
        });
    }).then(() => {
        alert("Review Submitted! Scores updated.");
        closeModal('rateModal');
        loadStalls();
    }).catch((err) => {
        console.error("Transaction failed: ", err);
    });
}

// --- 4. QR CODE & UTILS ---

function generateQR(name, score) {
    openModal('qrModal');
    document.getElementById('qrcode').innerHTML = ""; // Clear previous
    document.getElementById('qrStallName').innerText = name;
    document.getElementById('qrScore').innerText = score.toFixed(1);

    // Color code the score in modal
    const badge = document.getElementById('qrScore');
    if(score >= 4) badge.style.backgroundColor = '#27ae60';
    else if(score >= 2.5) badge.style.backgroundColor = '#f39c12';
    else badge.style.backgroundColor = '#e74c3c';

    // Generate QR
    // In a real app, this URL would point to the specific stall page: domain.com/stall?id=xyz
    const dataToEncode = `Stall: ${name} | Hygiene Score: ${score.toFixed(1)}/5 | Certified by HygieneCheck`;
    
    new QRCode(document.getElementById("qrcode"), {
        text: dataToEncode,
        width: 128,
        height: 128
    });
}

function searchStalls() {
    const term = document.getElementById('searchInput').value;
    loadStalls(term);
}

// Modal Helpers
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
}

// --- 5. SEED DATA (Run once) ---
document.getElementById('seedDataBtn').addEventListener('click', seedDatabase);

function seedDatabase() {
    const stalls = [
        {
            name: "Sharma Chaat Bhandar", city: "Delhi", locality: "Chandni Chowk",
            image: "https://images.unsplash.com/photo-1599639668352-71c8413645b8?auto=format&fit=crop&w=400&q=80",
            reviewCount: 12, overallScore: 4.5,
            scores: { water: 4.8, masks: 4.2, gloves: 4.5, clean: 4.5 }
        },
        {
            name: "Mumbai Vada Pav Center", city: "Mumbai", locality: "Dadar",
            image: "https://images.unsplash.com/photo-1606491956689-2ea28c674675?auto=format&fit=crop&w=400&q=80",
            reviewCount: 30, overallScore: 4.8,
            scores: { water: 4.9, masks: 5.0, gloves: 4.6, clean: 4.7 }
        },
        {
            name: "Kolkata Rolls", city: "Kolkata", locality: "Park Street",
            image: "https://images.unsplash.com/photo-1626132647523-66f5bf380005?auto=format&fit=crop&w=400&q=80",
            reviewCount: 8, overallScore: 3.2,
            scores: { water: 3.0, masks: 2.5, gloves: 3.5, clean: 3.8 }
        },
        {
            name: "Anna Dosa Corner", city: "Bangalore", locality: "Indiranagar",
            image: "https://images.unsplash.com/photo-1589301760579-253c9eff190f?auto=format&fit=crop&w=400&q=80",
            reviewCount: 45, overallScore: 4.2,
            scores: { water: 4.5, masks: 4.0, gloves: 4.0, clean: 4.3 }
        },
        {
            name: "Spicy Momos", city: "Delhi", locality: "Lajpat Nagar",
            image: "https://images.unsplash.com/photo-1626776876729-54a03a77869a?auto=format&fit=crop&w=400&q=80",
            reviewCount: 5, overallScore: 2.1,
            scores: { water: 2.0, masks: 1.5, gloves: 2.0, clean: 2.9 }
        }
    ];

    stalls.forEach(s => {
        db.collection("stalls").add(s);
    });
    alert("5 Stalls added to database!");
    loadStalls();
}

// Initial Load
loadStalls();