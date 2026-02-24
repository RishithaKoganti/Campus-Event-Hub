	document.addEventListener('DOMContentLoaded', function() {
	// ===== VIDEO SLIDER SETUP =====
	// Initialize the image (top) swiper normally (keeps autoplay)
	const imageSwiper = new Swiper(".mySwiper", {
		loop: true,
		autoplay: {
			delay: 5000,
			disableOnInteraction: false,
		},
		pagination: {
			el: ".mySwiper .swiper-pagination",
			clickable: true,
		},
		navigation: {
			nextEl: ".mySwiper .swiper-button-next",
			prevEl: ".mySwiper .swiper-button-prev",
		},
	});

	// Initialize the video swiper separately (no autoplay; manual navigation only)
	const videoSwiper = new Swiper(".myVideoSwiper", {
		loop: true,
		autoplay: false,
		allowTouchMove: true,
		simulateTouch: true,
		touchRatio: 1,
		pagination: {
			el: ".myVideoSwiper .swiper-pagination",
			clickable: true,
		},
		navigation: {
			nextEl: ".myVideoSwiper .swiper-button-next",
			prevEl: ".myVideoSwiper .swiper-button-prev",
		},
		keyboard: {
			enabled: true,
			onlyInViewport: true,
		},
	});

	const getAllVideos = () => Array.from(document.querySelectorAll('.myVideoSwiper video'));
	let videos = getAllVideos();

	function setAllVideosMuted(muted) {
		videos = getAllVideos();
		videos.forEach(v => { try { v.muted = !!muted; } catch (e) {} });
		document.querySelectorAll('.myVideoSwiper .mute-btn').forEach(btn => {
			try { btn.textContent = muted ? '🔈' : '🔊'; } catch (e) {}
		});
		const global = document.querySelector('.myVideoSwiper .global-mute-btn');
		if (global) global.textContent = muted ? '🔈' : '🔊';
		try { localStorage.setItem('videoMuted', muted ? 'true' : 'false'); } catch (e) {}
	}

	function pauseAllVideos() {
		videos = getAllVideos();
		videos.forEach(v => {
			try { v.pause(); v.currentTime = 0; } catch (e) {}
		});
	}

	// Tracks whether the video swiper container is currently visible in the viewport
	let videoContainerInView = false;

	function playActiveVideo() {
		// Only attempt play when the container is visible to the user
		if (!videoContainerInView) return;
		const activeVideo = document.querySelector('.myVideoSwiper .swiper-slide-active video');
		if (activeVideo) {
			activeVideo.play().catch(err => {
				console.warn('Video play() failed for active slide:', err);
			});
		}
	}

	// Attach diagnostic listeners (no automatic slide advance on video end)
	videos.forEach(v => {
		// NOTE: removed the 'ended' -> slideNext() handler so slides change only
		// when the user swipes/clicks navigation controls.

		// Log resource load problems and metadata for debugging deploy issues
		v.addEventListener('error', (ev) => {
			console.error('Video resource error for', v.currentSrc || v.src, ev);
			try {
				fetch(v.currentSrc || v.src, { method: 'HEAD' })
					.then(r => console.warn('HEAD response for', v.currentSrc || v.src, r.status))
					.catch(err => console.warn('HEAD request failed for', v.currentSrc || v.src, err));
			} catch (e) {
				console.warn('HEAD check not possible', e);
			}
		});

		v.addEventListener('loadedmetadata', () => {
			console.log('Video metadata loaded:', v.currentSrc || v.src, 'duration:', v.duration);
		});
	});

	// Ensure only the active slide's video plays
	videoSwiper.on('slideChangeTransitionStart', () => {
		pauseAllVideos();
	});

	videoSwiper.on('slideChangeTransitionEnd', () => {
		playActiveVideo();
	});

	// Initial play for video swiper
	pauseAllVideos();
	setTimeout(() => { if (document.querySelector('.myVideoSwiper')) playActiveVideo(); }, 200);

	// Some browsers block programmatic play until a user gesture. Attempt a one-time
	// resume when the user first interacts (click/touch) so videos start reliably.
	function onFirstUserGesture() {
		playActiveVideo();
		document.removeEventListener('pointerdown', onFirstUserGesture);
		document.removeEventListener('keydown', onFirstUserGesture);
	}
	document.addEventListener('pointerdown', onFirstUserGesture, { once: true });
	document.addEventListener('keydown', onFirstUserGesture, { once: true });

	// Observe whether the video swiper is visible in the viewport and only
	// allow playback when it is. When scrolled away, pause all videos.
	const videoContainer = document.querySelector('.myVideoSwiper');
	if (videoContainer && 'IntersectionObserver' in window) {
		const observerOptions = { root: null, rootMargin: '0px', threshold: [0, 0.25, 0.5, 0.75, 1] };
		const visibilityObserver = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				const visible = entry.intersectionRatio >= 0.5;
				videoContainerInView = visible;
				if (!visible) {
					// Not enough visible area — pause all videos immediately
					pauseAllVideos();
					// show overlays so user knows they're paused
					document.querySelectorAll('.myVideoSwiper .slide-overlay').forEach(o => { try { o.style.display = 'flex'; } catch (e) {} });
				} else {
					// When entering view, play the active video
					playActiveVideo();
					// hide overlay for active slide
					const activeOverlay = document.querySelector('.myVideoSwiper .swiper-slide-active .slide-overlay');
					if (activeOverlay) activeOverlay.style.display = 'none';
				}
			});
		}, observerOptions);

		// Start observing
		try { visibilityObserver.observe(videoContainer); } catch (e) { /* ignore */ }
	}

	// ===== VIDEO SLIDE OVERLAY & CLICK-TO-PLAY =====

	// Add a play overlay to each slide and wire click-to-play/pause without
	// blocking swipe gestures (videos have pointer-events controlled in CSS).
	function setupSlideOverlays() {
		const slides = document.querySelectorAll('.myVideoSwiper .swiper-slide');
		slides.forEach(slide => {
			// avoid duplicating
			if (slide.querySelector('.slide-overlay')) return;
			const overlay = document.createElement('div');
			overlay.className = 'slide-overlay';
			// play button centered, mute button anchored bottom-right
			overlay.innerHTML = '<div class="play-btn">►</div><button class="mute-btn" aria-label="Toggle sound">🔈</button>';
			slide.style.position = slide.style.position || 'relative';
			slide.appendChild(overlay);

			// wire click only on the play button so swipes can still reach the swiper
			const playBtn = overlay.querySelector('.play-btn');
			const muteBtn = overlay.querySelector('.mute-btn');
			const slideVideo = slide.querySelector('video');

			if (playBtn) {
				playBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					if (!slideVideo) return;
					if (slideVideo.paused) {
						pauseAllVideos();
						slideVideo.play().catch(() => {});
						playBtn.style.display = 'none';
					} else {
						slideVideo.pause();
						playBtn.style.display = 'flex';
					}
				});
			}

			// mute/unmute button
			if (muteBtn) {
				muteBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					if (!slideVideo) return;
					slideVideo.muted = !slideVideo.muted;
					muteBtn.textContent = slideVideo.muted ? '🔈' : '🔊';
				});
			}

			// set initial visual state (respect persisted preference if set)
			if (slideVideo) {
				playBtn.style.display = slideVideo.paused ? 'flex' : 'none';
				muteBtn.textContent = slideVideo.muted ? '🔈' : '🔊';
				muteBtn.style.display = 'flex';
			}
		});
	}

	// Keep overlays in sync when slides change
	videoSwiper.on('slideChangeTransitionEnd', () => {
		// show overlay for paused slides, hide for playing
		document.querySelectorAll('.myVideoSwiper .swiper-slide').forEach(slide => {
			const video = slide.querySelector('video');
			const overlay = slide.querySelector('.slide-overlay');
			if (!overlay || !video) return;
			overlay.style.display = video.paused ? 'flex' : 'none';
		});
	});

	// initial overlay setup
	setTimeout(() => { setupSlideOverlays(); }, 250);

	// Global mute toggle (persists preference across slides/sessions)
	function setupGlobalMute() {
		const container = document.querySelector('.myVideoSwiper');
		if (!container) return;
		if (container.querySelector('.global-mute-btn')) return;
		const btn = document.createElement('button');
		btn.className = 'global-mute-btn';
		btn.setAttribute('aria-label', 'Toggle slider sound');
		const persisted = (localStorage.getItem('videoMuted') === 'true');
		btn.textContent = persisted ? '🔈' : '🔊';
		container.style.position = container.style.position || 'relative';
		container.appendChild(btn);
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const newMuted = !(localStorage.getItem('videoMuted') === 'true');
			setAllVideosMuted(newMuted);
		});
	}

	// apply persisted muted state (if any)
	const initialMuted = (localStorage.getItem('videoMuted') === 'true');
	setAllVideosMuted(initialMuted);
	setTimeout(() => { setupGlobalMute(); }, 300);

	// ===== MODAL & AUTH SETUP =====
	const signupModal = document.getElementById('signupModal');
	const loginModal = document.getElementById('loginModal');
	const loginBtn = document.getElementById('loginBtn');
	const signupBtn = document.getElementById('signupBtn');
	const closeSignup = document.getElementById('closeSignup');
	const closeLogin = document.getElementById('closeLogin');

	// Modal toggle functions
	loginBtn.addEventListener('click', (e) => {
		e.preventDefault();
		loginModal.style.display = 'block';
		resetLoginForm();
	});

	signupBtn.addEventListener('click', (e) => {
		e.preventDefault();
		signupModal.style.display = 'block';
	});

	closeSignup.addEventListener('click', () => {
		signupModal.style.display = 'none';
	});

	closeLogin.addEventListener('click', () => {
		loginModal.style.display = 'none';
	});

	window.addEventListener('click', (event) => {
		if (event.target === signupModal) {
			signupModal.style.display = 'none';
		}
		if (event.target === loginModal) {
			loginModal.style.display = 'none';
		}
	});

	// ===== FORM VALIDATION & AUTH LOGIC =====

	// Validation functions
	function isValidBvritEmail(email) {
		return /^[^\s@]+@bvrit\.ac\.in$/.test(email);
	}

	function isValidIndianPhone(phone) {
		// 10 digits, starting with 6-9
		return /^[6-9]\d{9}$/.test(phone);
	}

	function validateSignupForm() {
		const name = document.getElementById('signupName').value.trim();
		const rollNo = document.getElementById('signupRollNo').value.trim();
		const email = document.getElementById('signupEmail').value.trim();
		const dept = document.getElementById('signupDept').value;
		const phone = document.getElementById('signupPhone').value.trim();
		const errorEl = document.getElementById('signupError');

		errorEl.textContent = '';

		if (!name) {
			errorEl.textContent = 'Name is required.';
			return false;
		}

		if (!rollNo) {
			errorEl.textContent = 'Roll No is required.';
			return false;
		}

		if (!email) {
			errorEl.textContent = 'Email is required.';
			return false;
		}

		if (!isValidBvritEmail(email)) {
			errorEl.textContent = 'Email must be a valid BVRIT address ending with @bvrit.ac.in';
			return false;
		}

		if (!dept) {
			errorEl.textContent = 'Department is required.';
			return false;
		}

		if (!phone) {
			errorEl.textContent = 'Phone number is required.';
			return false;
		}

		if (!isValidIndianPhone(phone)) {
			errorEl.textContent = 'Phone number must be a valid 10-digit Indian number (6-9 prefix).';
			return false;
		}

		return true;
	}

	// SIGNUP FORM HANDLER
	document.getElementById('signupForm').addEventListener('submit', (e) => {
		e.preventDefault();

		if (validateSignupForm()) {
			const name = document.getElementById('signupName').value.trim();
			const email = document.getElementById('signupEmail').value.trim();

			// Store user data in localStorage (for demo; in production, send to backend)
			const userData = {
				name: document.getElementById('signupName').value.trim(),
				rollNo: document.getElementById('signupRollNo').value.trim(),
				email: email,
				dept: document.getElementById('signupDept').value,
				phone: document.getElementById('signupPhone').value.trim(),
				registeredAt: new Date().toISOString()
			};

			localStorage.setItem('bvritUser_' + email, JSON.stringify(userData));

			// Show success message
			document.getElementById('signupError').className = 'success-message';
			document.getElementById('signupError').textContent = 'Sign up successful! You can now login.';

			// Close modal after 2 seconds
			setTimeout(() => {
				signupModal.style.display = 'none';
				document.getElementById('signupForm').reset();
				document.getElementById('signupError').className = 'error-message';
				document.getElementById('signupError').textContent = '';
			}, 2000);
		}
	});

	// LOGIN FORM HANDLERS
	const loginEmailStep = document.getElementById('loginEmailStep');
	const loginOtpStep = document.getElementById('loginOtpStep');
	const loginEmail = document.getElementById('loginEmail');
	const requestOtpBtn = document.getElementById('requestOtpBtn');
	const loginOtp = document.getElementById('loginOtp');
	const loginForm = document.getElementById('loginForm');
	const loginError = document.getElementById('loginError');

	let currentLoginEmail = '';
	let generatedOtp = '';

	// Request OTP
	requestOtpBtn.addEventListener('click', () => {
		const email = loginEmail.value.trim();
		loginError.textContent = '';

		if (!email) {
			loginError.textContent = 'Please enter your email.';
			return;
		}

		if (!isValidBvritEmail(email)) {
			loginError.textContent = 'Email must be a valid BVRIT address (@bvrit.ac.in).';
			return;
		}

		// Check if user has signed up
		const userData = localStorage.getItem('bvritUser_' + email);
		if (!userData) {
			loginError.textContent = 'Email not found. Please sign up first.';
			return;
		}

		// Generate OTP (4-6 digits)
		generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
		currentLoginEmail = email;

		// In production, send OTP via email using a backend service
		console.log(`OTP for ${email}: ${generatedOtp}`); // Demo: log to console

		// Show OTP step
		loginEmailStep.style.display = 'none';
		loginOtpStep.style.display = 'block';
		loginOtp.focus();

		loginError.className = 'success-message';
		loginError.textContent = `OTP sent to ${email}. (Demo: Check browser console for OTP)`;
	});

	// Verify OTP & Login
	loginForm.addEventListener('submit', (e) => {
		e.preventDefault();

		const enteredOtp = loginOtp.value.trim();
		loginError.textContent = '';

		if (!enteredOtp) {
			loginError.textContent = 'Please enter the OTP.';
			return;
		}

		if (enteredOtp !== generatedOtp) {
			loginError.textContent = 'Invalid OTP. Please try again.';
			return;
		}

		// OTP verified - login successful
		const userData = JSON.parse(localStorage.getItem('bvritUser_' + currentLoginEmail));

		loginError.className = 'success-message';
		loginError.textContent = `Welcome back, ${userData.name}!`;

		// Store logged-in user
		localStorage.setItem('loggedInUser', currentLoginEmail);

		// Close modal after 2 seconds
		setTimeout(() => {
			loginModal.style.display = 'none';
			resetLoginForm();
			updateAuthUI();
		}, 2000);
	});

	function resetLoginForm() {
		loginForm.reset();
		loginEmailStep.style.display = 'block';
		loginOtpStep.style.display = 'none';
		loginError.textContent = '';
		loginError.className = 'error-message';
		currentLoginEmail = '';
		generatedOtp = '';
	}

	// Update header UI if user is logged in
	function updateAuthUI() {
		const loggedInUser = localStorage.getItem('loggedInUser');
		if (loggedInUser) {
			const userData = JSON.parse(localStorage.getItem('bvritUser_' + loggedInUser));
			signupBtn.textContent = `Logout (${userData.name})`;
			signupBtn.id = 'logoutBtn';
			signupBtn.removeEventListener('click', signupBtnListener);
			signupBtn.addEventListener('click', (e) => {
				e.preventDefault();
				localStorage.removeItem('loggedInUser');
				signupBtn.textContent = 'Sign Up';
				signupBtn.id = 'signupBtn';
				updateAuthUI();
			});
		}
	}

	const signupBtnListener = (e) => {
		e.preventDefault();
		signupModal.style.display = 'block';
	};

	// Initialize auth UI on page load
	updateAuthUI();

	// ===== EVENT DETAIL MODAL =====

	const eventDetailModal = document.getElementById('eventDetailModal');
	const eventDetailClose = document.querySelector('.event-detail-close');
	const eventCards = document.querySelectorAll('.event-card');
	const sidebarItems = document.querySelectorAll('.sidebar-item');

	// Event data for each event
	const eventData = {
		athenes: {
			name: 'ATHENES',
			about: 'ATHENES is BVRIT\'s most celebrated annual feast of cultural activities. This spectacular event brings together students from all departments to showcase their talent in dance, music, band performances, and various cultural activities. It\'s a celebration of diversity and creativity where students display their artistic abilities on a grand stage.',
			images: ['images/athenesposter.jpg', 'images/athenes1.jpg'],
			schedule: [
				{ time: '10:00 AM - 12:00 PM', event: 'Registration & Setup' },
				{ time: '12:30 PM - 1:30 PM', event: 'Opening Ceremony' },
				{ time: '1:30 PM - 3:00 PM', event: 'Dance Performances' },
				{ time: '3:00 PM - 4:00 PM', event: 'Lunch Break' },
				{ time: '4:00 PM - 5:30 PM', event: 'Music & Band Performance' },
				{ time: '5:30 PM - 6:30 PM', event: 'Prize Distribution' }
			],
			stalls: [
				{ name: 'Food Court', description: 'Various food vendors offering snacks and meals' },
				{ name: 'Merchandise Stall', description: 'College memorabilia and event merchandise' },
				{ name: 'Photography Booth', description: 'Professional photography and instant prints' },
				{ name: 'Arts & Crafts', description: 'Handmade items and traditional crafts' }
			],
			guests: [
				{ name: 'Chief Guest TBA', designation: 'Guest of Honor' },
				{ name: 'Dr. P. Ravindra Babu', designation: 'Principal, BVRIT' },
				{ name: 'Faculty Coordinators', designation: 'Event Management' }
			]
		},
		avirbhav: {
			name: 'AVIRBHAV',
			about: 'AVIRBHAV is BVRIT\'s traditional day celebration where students and faculty come together to display traditional attire, music, dance, and art. This event celebrates India\'s rich cultural heritage with participants wearing traditional costumes representing various states and communities. It\'s a colorful celebration of diversity and cultural pride.',
			images: ['images/avirbhavposter.jpg', 'images/traditional1.jpg'],
			schedule: [
				{ time: '9:00 AM - 10:00 AM', event: 'Gate Opening & Registration' },
				{ time: '10:00 AM - 11:00 AM', event: 'Opening Parade' },
				{ time: '11:00 AM - 1:00 PM', event: 'Traditional Performances' },
				{ time: '1:00 PM - 2:00 PM', event: 'Lunch Break' },
				{ time: '2:00 PM - 4:00 PM', event: 'Art Exhibitions & Cultural Showcase' },
				{ time: '4:00 PM - 5:00 PM', event: 'Awards & Closing Ceremony' }
			],
			stalls: [
				{ name: 'Traditional Food Stall', description: 'Regional cuisines and traditional recipes' },
				{ name: 'Handicrafts', description: 'Traditional art and handicraft items' },
				{ name: 'Clothing & Accessories', description: 'Traditional attire and jewelry' }
			],
			guests: [
				{ name: 'Guest Speaker', designation: 'Cultural Expert' },
				{ name: 'Traditional Performers', designation: 'Cultural Artists' },
				{ name: 'Faculty Members', designation: 'Event Coordinators' }
			]
		},
		baja: {
			name: 'BAJA',
			about: 'BAJA (Baja SAE India) is India\'s leading ATV motorsports competition. This event challenges over 70+ teams from across the nation to design, build, and race all-terrain vehicles. Teams focus on engineering excellence, innovative design, and demonstrate their skills through a rigorous 4-hour endurance race. It\'s the ultimate test of automotive engineering and teamwork.',
			images: ['images/bajaposter.jpg', 'images/baja1.jpg', 'images/baja2.jpg'],
			schedule: [
				{ time: 'Day 1: 8:00 AM', event: 'Vehicle Inspection & Technical Scrutiny' },
				{ time: 'Day 1: 2:00 PM', event: 'Cost & Design Presentation' },
				{ time: 'Day 2: 6:00 AM', event: 'Acceleration & Braking Events' },
				{ time: 'Day 2: 12:00 PM', event: 'Endurance Race (4 Hours)' },
				{ time: 'Day 3: 10:00 AM', event: 'Prize Distribution & Closing Ceremony' }
			],
			stalls: [
				{ name: 'Sponsor Booths', description: 'Automotive companies and sponsors' },
				{ name: 'Pit Stop Vendors', description: 'Racing fuel and pit stop supplies' },
				{ name: 'Food & Beverage', description: 'Refreshments for participants and spectators' }
			],
			guests: [
				{ name: 'SAE India Officials', designation: 'Event Organizers' },
				{ name: 'Automotive Industry Experts', designation: 'Judges & Evaluators' },
				{ name: 'Team Mentors', designation: 'Technical Advisors' }
			]
		},
		canoe: {
			name: 'CONCRETE CANOE COMPETITION',
			about: 'The Concrete Canoe Competition is an engineering marvel on water. Teams of students design and build functional canoes made from concrete, challenging conventional thinking about materials. Participants compete in both a design competition and on-water racing, demonstrating innovation, problem-solving, and teamwork. It\'s a unique event that combines creativity with engineering prowess.',
			images: ['images/canoeposter.jpg', 'images/boat.jpg'],
			schedule: [
				{ time: '8:00 AM - 9:00 AM', event: 'Registration & Safety Briefing' },
				{ time: '9:00 AM - 10:00 AM', event: 'Design Presentation Judging' },
				{ time: '10:30 AM - 12:30 PM', event: 'On-Water Racing Event 1' },
				{ time: '12:30 PM - 1:30 PM', event: 'Lunch Break' },
				{ time: '1:30 PM - 3:30 PM', event: 'On-Water Racing Event 2' },
				{ time: '3:30 PM - 4:30 PM', event: 'Prize Distribution' }
			],
			stalls: [
				{ name: 'Material Suppliers', description: 'Concrete and construction materials' },
				{ name: 'Safety Equipment', description: 'Life jackets and safety gear' },
				{ name: 'Refreshment Stall', description: 'Food and beverages' }
			],
			guests: [
				{ name: 'Civil Engineering Experts', designation: 'Judges' },
				{ name: 'Water Safety Officers', designation: 'Safety Coordinators' },
				{ name: 'BVRIT Faculty', designation: 'Event Organizers' }
			]
		},
		autoexpo: {
			name: 'AUTO-EXPO',
			about: 'AUTO-EXPO is an absolute blast of overpowered engines! This exhibition showcases the fastest and wildest vehicles, featuring spectacular drift performances and impressive displays of automotive power. Watch as machines showcase their absolute potential with eye-feasting drifts, high-speed revs, and thrilling stunts. It\'s the ultimate celebration of automotive excellence and adrenaline-pumping action.',
			images: ['images/expoposter.jpg', 'images/expo1.jpg', 'images/expo2.jpg'],
			schedule: [
				{ time: '10:00 AM - 11:00 AM', event: 'Vehicle Entry & Setup' },
				{ time: '11:00 AM - 12:00 PM', event: 'Opening Show & Stunts' },
				{ time: '12:00 PM - 2:00 PM', event: 'Drift Performances' },
				{ time: '2:00 PM - 3:00 PM', event: 'Lunch Break' },
				{ time: '3:00 PM - 4:30 PM', event: 'High-Speed Racing Demonstrations' },
				{ time: '4:30 PM - 5:30 PM', event: 'Closing Ceremony & Awards' }
			],
			stalls: [
				{ name: 'Automotive Dealers', description: 'Latest vehicle models and brands' },
				{ name: 'Accessories Shop', description: 'Car accessories and upgrades' },
				{ name: 'Food Festival', description: 'Various food vendors' },
				{ name: 'Photography Booth', description: 'Professional photo sessions' }
			],
			guests: [
				{ name: 'Professional Stunt Drivers', designation: 'Performers' },
				{ name: 'Automotive Enthusiasts', designation: 'Guest Speakers' },
				{ name: 'Auto Industry Representatives', designation: 'Exhibitors' }
			]
		}
	};

	function generateScheduleTable(scheduleArray) {
		let html = '<table class="event-schedule-table"><thead><tr><th>Time</th><th>Event</th></tr></thead><tbody>';
		scheduleArray.forEach(item => {
			html += `<tr><td>${item.time}</td><td>${item.event}</td></tr>`;
		});
		html += '</tbody></table>';
		return html;
	}

	function generateStallsContent(stallsArray) {
		let html = '';
		stallsArray.forEach(stall => {
			html += `<div class="stall-item"><h4>${stall.name}</h4><p>${stall.description}</p></div>`;
		});
		return html;
	}

	function generateGuestsContent(guestsArray) {
		let html = '';
		guestsArray.forEach(guest => {
			html += `<div class="guest-item"><h4>${guest.name}</h4><p><strong>${guest.designation}</strong></p></div>`;
		});
		return html;
	}

	function generateImagesContent(imagesArray) {
		let html = '';
		imagesArray.forEach(img => {
			html += `<img src="${img}" alt="Event Image" />`;
		});
		return html;
	}

	function openEventDetail(eventId) {
		const event = eventData[eventId];
		if (!event) return;

		// Update sidebar title
		document.querySelector('.event-name-sidebar').textContent = event.name;

		// Update content for all sections
		document.getElementById('about-content').textContent = event.about;
		document.getElementById('images-content').innerHTML = generateImagesContent(event.images);
		document.getElementById('schedule-content').innerHTML = generateScheduleTable(event.schedule);
		document.getElementById('stalls-content').innerHTML = generateStallsContent(event.stalls);
		document.getElementById('guests-content').innerHTML = generateGuestsContent(event.guests);

		// Update all event title spans
		document.querySelectorAll('.event-title').forEach(el => {
			el.textContent = event.name;
		});

		// Show modal
		eventDetailModal.classList.add('active');
	}

	function closeEventDetail() {
		eventDetailModal.classList.remove('active');
	}

	// Event card click handlers
	eventCards.forEach(card => {
		card.addEventListener('click', function() {
			const eventId = this.getAttribute('data-event-id');
			openEventDetail(eventId);
		});
	});

	// Close modal button
	eventDetailClose.addEventListener('click', closeEventDetail);

	// Close modal when clicking outside
	eventDetailModal.addEventListener('click', function(e) {
		if (e.target === this) {
			closeEventDetail();
		}
	});

	// Sidebar navigation
	sidebarItems.forEach(item => {
		item.addEventListener('click', function(e) {
			e.preventDefault();
			const section = this.getAttribute('data-section');

			// Remove active class from all items and sections
			sidebarItems.forEach(el => el.classList.remove('active'));
			document.querySelectorAll('.event-section').forEach(el => el.classList.remove('active'));

			// Add active class to clicked item and corresponding section
			this.classList.add('active');
			document.getElementById(`section-${section}`).classList.add('active');
		});
	});

	});


 