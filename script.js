// ==================== قلم ومايك - النسخة الكاملة 100% ====================
// تم التطوير بواسطة: كريم عاطف (Kareem Atef)
// التاريخ: 2026-05-27

// ========== 1. المتغيرات العامة ==========
let currentUser = null;
let currentChatId = null;
let currentUtterance = null;
let editingStoryId = null;

// ========== 2. دوال مساعدة ==========
function showToast(message, type = 'success') {
    let toast = document.getElementById('notificationToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'notificationToast';
        toast.className = 'notification-toast';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.backgroundColor = type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#e94560');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function timeAgo(date) {
    if (!date) return 'الآن';
    let d = date.toDate ? date.toDate() : new Date(date);
    let seconds = Math.floor((new Date() - d) / 1000);
    if (seconds < 60) return 'الآن';
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقيقة`;
    let hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    let days = Math.floor(hours / 24);
    if (days < 7) return `${days} يوم`;
    return d.toLocaleDateString('ar');
}

function getUserNameById(userId) {
    return db.collection('users').doc(userId).get()
        .then(doc => doc.exists ? doc.data().name : 'مستخدم')
        .catch(() => 'مستخدم');
}

function addUserPoints(userId, points) {
    db.collection('users').doc(userId).update({
        points: firebase.firestore.FieldValue.increment(points)
    }).catch(e => console.warn(e));
}

// ========== 3. تحديث واجهة المستخدم ==========
function updateNavUser() {
    const navUser = document.getElementById('navUser');
    if (!navUser) return;
    if (currentUser) {
        navUser.innerHTML = `
            <div class="user-dropdown">
                <button class="user-btn" onclick="toggleUserMenu()"><i class="fas fa-user-circle"></i> ${escapeHtml(currentUser.name)}</button>
                <div class="user-dropdown-menu" id="userMenu">
                    <a href="my-stories.html"><i class="fas fa-book"></i> كتاباتي</a>
                    <a href="profile.html"><i class="fas fa-user"></i> ملفي الشخصي</a>
                    <a href="settings.html"><i class="fas fa-cog"></i> الإعدادات</a>
                    <button onclick="logout()"><i class="fas fa-sign-out-alt"></i> تسجيل الخروج</button>
                </div>
            </div>
        `;
    } else {
        navUser.innerHTML = '<a href="login.html" class="login-btn"><i class="fas fa-user"></i><span>دخول</span></a>';
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('show');
}

function updateAdminButtons() {
    const isAdmin = currentUser && (currentUser.role === 'admin');
    const adminBtns = document.querySelectorAll('.admin-only-btn');
    adminBtns.forEach(btn => btn.style.display = isAdmin ? 'inline-flex' : 'none');
}

function updateGreeting() {
    const msg = document.getElementById('greetingMessage');
    if (msg) {
        const hour = new Date().getHours();
        let greeting = hour < 12 ? '🌅 صباح الخير' : (hour < 18 ? '☀️ مساء النور' : '🌙 مساء الحلو');
        msg.innerText = `${greeting} ${currentUser ? currentUser.name : 'زائرنا الكريم'} 👋`;
    }
}

function updateOnlineStatus() {
    const status = document.getElementById('onlineStatus');
    if (status) {
        if (navigator.onLine) {
            status.innerHTML = '<i class="fas fa-wifi"></i><span>متصل</span>';
            status.classList.remove('offline');
            status.classList.add('online');
        } else {
            status.innerHTML = '<i class="fas fa-wifi-slash"></i><span>غير متصل</span>';
            status.classList.remove('online');
            status.classList.add('offline');
        }
    }
}

function updateStats() {
    Promise.all([
        db.collection('stories').get(),
        db.collection('users').get()
    ]).then(([stories, users]) => {
        document.getElementById('storiesCount') && (document.getElementById('storiesCount').innerText = stories.size);
        document.getElementById('usersCount') && (document.getElementById('usersCount').innerText = users.size);
        document.getElementById('visitsCount') && (document.getElementById('visitsCount').innerText = stories.size + users.size);
    }).catch(e => console.warn(e));
}

function updateLastUpdate() {
    const span = document.getElementById('lastUpdate');
    if (span) span.innerText = new Date().toLocaleDateString('ar');
}

// ========== 4. تسجيل الدخول والتسجيل والخروج ==========
function simpleLogin() {
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showToast('❌ يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            return db.collection('users').doc(userCredential.user.uid).get();
        })
        .then((doc) => {
            if (doc.exists) {
                currentUser = { id: doc.id, ...doc.data() };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showToast(`✅ مرحباً ${currentUser.name}`);
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } else {
                showToast('⚠️ بيانات المستخدم غير مكتملة', 'error');
            }
        })
        .catch(() => {
            showToast('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
        });
}

function socialLogin(provider) {
    let authProvider;
    if (provider === 'google') {
        authProvider = new firebase.auth.GoogleAuthProvider();
    } else if (provider === 'facebook') {
        authProvider = new firebase.auth.FacebookAuthProvider();
    } else if (provider === 'apple') {
        authProvider = new firebase.auth.OAuthProvider('apple.com');
    } else {
        showToast('طريقة تسجيل دخول غير مدعومة', 'error');
        return;
    }
    
    auth.signInWithPopup(authProvider)
        .then((result) => {
            const user = result.user;
            return db.collection('users').doc(user.uid).get().then((doc) => {
                if (!doc.exists) {
                    return db.collection('users').doc(user.uid).set({
                        name: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        role: 'user',
                        avatar: '👤',
                        country: 'مصر',
                        followers: [],
                        following: [],
                        badges: ['✨ عضو جديد'],
                        level: 1,
                        points: 10,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                return doc;
            });
        })
        .then((doc) => {
            currentUser = { id: doc.id, ...doc.data() };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast(`✅ مرحباً ${currentUser.name}`);
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        })
        .catch(() => {
            showToast('❌ فشل تسجيل الدخول', 'error');
        });
}

function register() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const confirmPassword = document.getElementById('regConfirmPassword')?.value;
    
    if (!name || !email || !password) {
        showToast('❌ يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('❌ كلمة المرور غير متطابقة', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            return db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                role: 'user',
                avatar: '👤',
                country: 'مصر',
                followers: [],
                following: [],
                badges: ['✨ عضو جديد'],
                level: 1,
                points: 10,
                bio: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            showToast('✅ تم إنشاء الحساب بنجاح! 🎉');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        })
        .catch((error) => {
            showToast('❌ حدث خطأ: ' + error.message, 'error');
        });
}

function logout() {
    auth.signOut()
        .then(() => {
            localStorage.removeItem('currentUser');
            currentUser = null;
            showToast('✅ تم تسجيل الخروج');
            setTimeout(() => { window.location.href = 'index.html'; }, 500);
        })
        .catch((error) => {
            console.error(error);
        });
}

// ========== 5. مراقبة حالة المستخدم ==========
auth.onAuthStateChanged((user) => {
    if (user) {
        db.collection('users').doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    currentUser = { id: user.uid, ...doc.data() };
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                } else {
                    currentUser = { id: user.uid, name: user.email, email: user.email, role: 'user', avatar: '👤' };
                }
                updateNavUser();
                updateAdminButtons();
                updateGreeting();
                if (document.getElementById('profileContainer')) loadProfile();
                if (document.getElementById('settingsContainer')) loadSettings();
            })
            .catch(() => {
                currentUser = { id: user.uid, name: user.email, email: user.email, role: 'user', avatar: '👤' };
                updateNavUser();
                updateAdminButtons();
                updateGreeting();
            });
    } else {
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateNavUser();
        updateAdminButtons();
        updateGreeting();
    }
});

// ========== 6. عرض المنشورات ==========
function loadStories(filter = 'all') {
    const container = document.getElementById('storiesGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    let query = db.collection('stories').orderBy('createdAt', 'desc');
    if (filter !== 'all') {
        query = query.where('category', '==', filter);
    }
    
    query.get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-feather-alt"></i><p>لا توجد كتابات بعد</p><a href="add-story.html" class="btn-primary">كن أول من يكتب ✍️</a></div>';
                return;
            }
            
            const stories = [];
            snapshot.forEach(doc => {
                stories.push({ id: doc.id, ...doc.data() });
            });
            
            container.innerHTML = stories.map(story => `
                <div class="post-card" onclick="viewStory('${story.id}')">
                    <div class="post-header">
                        <div class="post-avatar">${story.authorAvatar || '📝'}</div>
                        <div class="post-author">
                            <div class="post-author-name">${escapeHtml(story.authorName)}</div>
                            <div class="post-author-meta">${story.createdAt ? timeAgo(story.createdAt) : 'تاريخ غير معروف'} • <span class="post-category">${story.category}</span></div>
                        </div>
                    </div>
                    <div class="post-content">
                        <h3 class="post-title">${escapeHtml(story.title)}</h3>
                        <p class="post-excerpt">${escapeHtml(story.content.substring(0, 120))}...</p>
                        <div class="post-hashtags">${(story.hashtags || []).map(t => `<span class="hashtag-link">#${escapeHtml(t)}</span>`).join(' ')}</div>
                    </div>
                    <div class="post-stats">
                        <span class="post-stat"><i class="fas fa-heart"></i> ${story.likes || 0}</span>
                        <span class="post-stat"><i class="fas fa-eye"></i> ${story.views || 0}</span>
                        <span class="post-stat"><i class="fas fa-comment"></i> ${story.comments?.length || 0}</span>
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ في التحميل</p></div>';
        });
}

function viewStory(storyId) {
    window.location.href = `story-details.html?id=${storyId}`;
}

// ========== 7. تفاصيل القصة والإعجاب والتعليق ==========
function loadStoryDetails() {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get('id');
    const container = document.getElementById('storyDetails');
    
    if (!container || !storyId) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    db.collection('stories').doc(storyId).get()
        .then((doc) => {
            if (!doc.exists) {
                container.innerHTML = '<div class="empty-state"><p>القصة غير موجودة</p><a href="index.html">العودة للرئيسية</a></div>';
                return;
            }
            
            const story = { id: doc.id, ...doc.data() };
            
            db.collection('stories').doc(storyId).update({
                views: firebase.firestore.FieldValue.increment(1)
            }).catch(e => console.warn(e));
            
            container.innerHTML = `
                <article class="story-article">
                    <h1>${escapeHtml(story.title)}</h1>
                    <div class="story-meta">
                        <span>✍️ ${escapeHtml(story.authorName)}</span>
                        <span>📅 ${story.createdAt ? timeAgo(story.createdAt) : 'تاريخ غير معروف'}</span>
                        <span>🏷️ ${story.category}</span>
                        <span>👁️ ${(story.views || 0) + 1} مشاهدة</span>
                        <span>❤️ ${story.likes || 0} إعجاب</span>
                    </div>
                    <div class="story-content">${escapeHtml(story.content).replace(/\n/g, '<br>')}</div>
                    <div class="story-hashtags">${(story.hashtags || []).map(t => `<a href="hashtag.html?tag=${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join(' ')}</div>
                    <div class="story-actions">
                        <button onclick="likeStory('${story.id}')" class="like-btn"><i class="fas fa-heart"></i> ${story.likes || 0}</button>
                        <button onclick="reportStory('${story.id}')" class="report-btn"><i class="fas fa-flag"></i> الإبلاغ</button>
                        <button onclick="speakStory()" class="audio-btn"><i class="fas fa-headphones"></i> استماع</button>
                    </div>
                    <div class="comments-section">
                        <h4>💬 التعليقات (${story.comments?.length || 0})</h4>
                        ${currentUser ? `<div class="add-comment"><textarea id="commentText" placeholder="اكتب تعليقك..."></textarea><button onclick="addComment('${story.id}')" class="btn-primary">نشر</button></div>` : '<p><a href="login.html">سجل الدخول</a> لتتمكن من التعليق</p>'}
                        <div class="comments-list">${(story.comments || []).map(c => `
                            <div class="comment">
                                <strong>${escapeHtml(c.userName)}</strong>
                                <p>${escapeHtml(c.text)}</p>
                                <small>${new Date(c.date).toLocaleString('ar')}</small>
                            </div>
                        `).join('')}</div>
                    </div>
                </article>
            `;
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ في تحميل القصة</p></div>';
        });
}

function likeStory(storyId) {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const storyRef = db.collection('stories').doc(storyId);
    storyRef.get()
        .then((doc) => {
            if (doc.exists) {
                const likedBy = doc.data().likedBy || [];
                if (likedBy.includes(currentUser.id)) {
                    showToast('⚠️ انت أعجبت بهذه القصة من قبل', 'info');
                    return;
                }
                return storyRef.update({
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
                });
            }
        })
        .then(() => {
            showToast('👍 تم الإعجاب');
            loadStoryDetails();
            addUserPoints(currentUser.id, 1);
        })
        .catch((error) => { console.error(error); });
}

function addComment(storyId) {
    const commentText = document.getElementById('commentText')?.value;
    if (!commentText || commentText.trim() === '') {
        showToast('❌ اكتب تعليقاً أولاً', 'error');
        return;
    }
    
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const storyRef = db.collection('stories').doc(storyId);
    storyRef.get()
        .then((doc) => {
            if (doc.exists) {
                const comments = doc.data().comments || [];
                comments.push({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    text: commentText,
                    date: new Date().toISOString()
                });
                return storyRef.update({ comments: comments });
            }
        })
        .then(() => {
            showToast('✅ تم نشر التعليق');
            document.getElementById('commentText').value = '';
            loadStoryDetails();
            addUserPoints(currentUser.id, 2);
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function reportStory(storyId) {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        return;
    }
    const reason = prompt('لماذا تبلغ عن هذا المحتوى؟');
    if (!reason) return;
    
    db.collection('reports').add({
        storyId: storyId,
        userId: currentUser.id,
        userName: currentUser.name,
        reason: reason,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showToast('✅ تم الإبلاغ، سيتم مراجعته');
    }).catch((error) => {
        console.error(error);
        showToast('❌ حدث خطأ', 'error');
    });
}

// ========== 8. الاستماع الصوتي ==========
function speakStory() {
    const content = document.querySelector('.story-content')?.innerText;
    if (!content) {
        showToast('لا يوجد نص للاستماع', 'error');
        return;
    }
    
    if (currentUtterance) {
        speechSynthesis.cancel();
        currentUtterance = null;
        const btn = document.getElementById('audioPlayBtn');
        if (btn) btn.innerHTML = '<i class="fas fa-headphones"></i> استماع للقصة';
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'ar-EG';
    utterance.rate = 0.9;
    utterance.onend = () => {
        currentUtterance = null;
        const btn = document.getElementById('audioPlayBtn');
        if (btn) btn.innerHTML = '<i class="fas fa-headphones"></i> استماع للقصة';
    };
    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
    
    const btn = document.getElementById('audioPlayBtn');
    if (btn) btn.innerHTML = '<i class="fas fa-stop"></i> إيقاف';
}

// ========== 9. شريط تقدم القراءة ==========
function updateReadingProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById('readingProgress');
    if (progressBar) progressBar.style.width = scrolled + '%';
}
window.addEventListener('scroll', updateReadingProgress);

// ========== 10. إضافة منشور ==========
function addStory(event) {
    if (event) event.preventDefault();
    
    if (!currentUser) {
        showToast('⚠️ يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        return false;
    }
    
    const title = document.getElementById('storyTitle')?.value;
    const category = document.getElementById('storyCategory')?.value;
    const content = document.getElementById('storyContent')?.value;
    const image = document.getElementById('storyImage')?.value || '📝';
    
    if (!title || !category || !content) {
        showToast('❌ يرجى ملء جميع الحقول', 'error');
        return false;
    }
    
    const hashtags = [];
    const matches = content.match(/#[\u0600-\u06FF\w]+/g);
    if (matches) matches.forEach(tag => hashtags.push(tag.substring(1)));
    
    const storyData = {
        title: title.trim(),
        category: category,
        content: content.trim(),
        hashtags: [...new Set(hashtags)],
        image: image,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar || '📝',
        likes: 0,
        views: 0,
        comments: [],
        reports: [],
        likedBy: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (editingStoryId) {
        db.collection('stories').doc(editingStoryId).update(storyData)
            .then(() => {
                showToast('✅ تم تعديل المنشور بنجاح!');
                editingStoryId = null;
                localStorage.removeItem('editStoryId');
                setTimeout(() => { window.location.href = 'my-stories.html'; }, 1500);
            })
            .catch((error) => {
                console.error(error);
                showToast('❌ حدث خطأ في التعديل', 'error');
            });
    } else {
        db.collection('stories').add(storyData)
            .then(() => {
                showToast('✅ تم النشر بنجاح! جاري التحويل...');
                addUserPoints(currentUser.id, 10);
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            })
            .catch((error) => {
                console.error(error);
                showToast('❌ حدث خطأ في النشر', 'error');
            });
    }
    
    return false;
}

// ========== 11. كتاباتي ==========
function loadMyStories() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const container = document.getElementById('myStoriesList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    db.collection('stories').where('authorId', '==', currentUser.id).orderBy('createdAt', 'desc').get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-book"></i><p>لم تنشر أي شيء بعد</p><a href="add-story.html" class="btn-primary">اكتب الآن ✍️</a></div>';
                return;
            }
            
            const stories = [];
            snapshot.forEach(doc => {
                stories.push({ id: doc.id, ...doc.data() });
            });
            
            container.innerHTML = stories.map(story => `
                <div class="post-card">
                    <div class="post-header">
                        <div class="post-avatar">${story.authorAvatar}</div>
                        <div>
                            <strong>${escapeHtml(story.title)}</strong>
                            <div class="post-author-meta">${story.category} • ${story.createdAt ? timeAgo(story.createdAt) : ''}</div>
                        </div>
                    </div>
                    <div class="post-content"><p>${escapeHtml(story.content.substring(0, 100))}...</p></div>
                    <div class="post-stats">
                        <span>❤️ ${story.likes || 0}</span>
                        <span>👁️ ${story.views || 0}</span>
                        <span>💬 ${story.comments?.length || 0}</span>
                    </div>
                    <div class="post-actions">
                        <button onclick="editStory('${story.id}')" class="admin-edit-btn"><i class="fas fa-edit"></i> تعديل</button>
                        <button onclick="deleteStory('${story.id}')" class="admin-delete-btn"><i class="fas fa-trash"></i> حذف</button>
                    </div>
                </div>
            `).join('');
            
            loadBadges();
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function deleteStory(storyId) {
    if (!confirm('هل أنت متأكد من حذف هذه الكتابة؟')) return;
    
    db.collection('stories').doc(storyId).delete()
        .then(() => {
            showToast('✅ تم الحذف بنجاح');
            loadMyStories();
            updateStats();
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function editStory(storyId) {
    editingStoryId = storyId;
    localStorage.setItem('editStoryId', storyId);
    window.location.href = 'add-story.html?edit=true';
}

function loadEditStory() {
    const editId = localStorage.getItem('editStoryId');
    if (!editId) {
        editingStoryId = null;
        return;
    }
    editingStoryId = editId;
    
    db.collection('stories').doc(editId).get()
        .then((doc) => {
            if (doc.exists) {
                const story = { id: doc.id, ...doc.data() };
                document.getElementById('storyTitle').value = story.title;
                document.getElementById('storyCategory').value = story.category;
                document.getElementById('storyContent').value = story.content;
                document.getElementById('storyImage').value = story.image;
                document.querySelector('.form-card h2').innerHTML = '✏️ تعديل كتابة';
                document.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
                updateLivePreview();
            }
        })
        .catch((error) => console.error(error));
}

function loadBadges() {
    const container = document.getElementById('badgesSection');
    if (!container || !currentUser) return;
    
    db.collection('stories').where('authorId', '==', currentUser.id).get()
        .then((snapshot) => {
            const myStories = [];
            snapshot.forEach(doc => myStories.push(doc.data()));
            const totalLikes = myStories.reduce((sum, s) => sum + (s.likes || 0), 0);
            
            const badges = [...(currentUser.badges || [])];
            if (myStories.length >= 1 && !badges.includes('🚀 البداية')) badges.push('🚀 البداية');
            if (myStories.length >= 5 && !badges.includes('✍️ كاتب محترف')) badges.push('✍️ كاتب محترف');
            if (totalLikes >= 50 && !badges.includes('⭐ نجم المنصة')) badges.push('⭐ نجم المنصة');
            
            if (badges.length > (currentUser.badges?.length || 0)) {
                currentUser.badges = badges;
                db.collection('users').doc(currentUser.id).update({ badges: badges });
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            container.innerHTML = badges.map(b => `<span class="badge">${b}</span>`).join('');
        })
        .catch(e => console.warn(e));
}

// ========== 12. المعاينة الحية ==========
function updateLivePreview() {
    const preview = document.getElementById('livePreview');
    if (!preview) return;
    const title = document.getElementById('storyTitle')?.value || 'العنوان';
    const content = document.getElementById('storyContent')?.value || 'محتوى الكتابة...';
    const category = document.getElementById('storyCategory')?.value || 'تصنيف';
    preview.innerHTML = `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar">${currentUser?.avatar || '📝'}</div>
                <div>
                    <strong>${currentUser?.name || 'أنت'}</strong>
                    <div class="post-category">${category}</div>
                </div>
            </div>
            <div class="post-content">
                <h4>${escapeHtml(title)}</h4>
                <p>${escapeHtml(content.substring(0, 100))}...</p>
                <div class="post-hashtags">${(content.match(/#[\u0600-\u06FF\w]+/g) || []).map(t => `<span class="hashtag-link">${escapeHtml(t)}</span>`).join(' ')}</div>
            </div>
        </div>
    `;
}

// ========== 13. البطولات (معدلة للعمل مع Firebase) ==========
function loadTournaments() {
    const activeContainer = document.getElementById('activeTournaments');
    const upcomingContainer = document.getElementById('upcomingTournaments');
    const completedContainer = document.getElementById('completedTournaments');
    
    if (!activeContainer) return;
    
    activeContainer.innerHTML = '<div class="loading-state">جاري التحميل...</div>';
    
    db.collection('tournaments').get()
        .then((snapshot) => {
            const tournaments = [];
            snapshot.forEach(doc => tournaments.push({ id: doc.id, ...doc.data() }));
            
            const active = tournaments.filter(t => t.status === 'active');
            const upcoming = tournaments.filter(t => t.status === 'upcoming');
            const completed = tournaments.filter(t => t.status === 'completed');
            
            if (activeContainer) {
                activeContainer.innerHTML = active.map(t => `
                    <div class="tournament-card" onclick="viewTournament('${t.id}')">
                        <h3>🏆 ${escapeHtml(t.name)}</h3>
                        <p>${t.type || 'غير محدد'} • ${t.category || 'غير محدد'}</p>
                        <p>💰 ${t.prize || 0} جنيه</p>
                        <p>👥 ${t.participants?.length || 0}/${t.maxParticipants || 50}</p>
                        <button onclick="event.stopPropagation(); joinTournament('${t.id}')" class="btn-primary">اشترك الآن</button>
                    </div>
                `).join('');
                if (active.length === 0) activeContainer.innerHTML = '<div class="empty-state">🚀 لا توجد بطولات نشطة حالياً</div>';
            }
            
            if (upcomingContainer) {
                upcomingContainer.innerHTML = upcoming.map(t => `
                    <div class="tournament-card">
                        <h3>⏰ ${escapeHtml(t.name)}</h3>
                        <p>${t.type || 'غير محدد'} • ${t.category || 'غير محدد'}</p>
                        <p>💰 ${t.prize || 0} جنيه</p>
                        <p>📅 تبدأ: ${t.startDate ? new Date(t.startDate).toLocaleDateString('ar') : 'تاريخ غير محدد'}</p>
                        <button class="btn-secondary">قريباً</button>
                    </div>
                `).join('');
            }
            
            if (completedContainer) {
                completedContainer.innerHTML = completed.map(t => `
                    <div class="tournament-card">
                        <h3>🏁 ${escapeHtml(t.name)}</h3>
                        <p>${t.type || 'غير محدد'} • ${t.category || 'غير محدد'}</p>
                        <p>🏅 الفائز: ${t.winner || 'لم يحدد'}</p>
                        <button class="btn-secondary">انتهت</button>
                    </div>
                `).join('');
            }
        })
        .catch(error => {
            console.error(error);
            activeContainer.innerHTML = '<div class="empty-state">⚠️ حدث خطأ في تحميل البطولات</div>';
        });
}

function viewTournament(tournamentId) {
    window.location.href = `tournament-details.html?id=${tournamentId}`;
}

function loadTournamentDetails() {
    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');
    const container = document.getElementById('tournamentDetails');
    if (!container || !tournamentId) return;
    
    container.innerHTML = '<div class="loading-state">جاري التحميل...</div>';
    
    db.collection('tournaments').doc(tournamentId).get()
        .then(doc => {
            if (!doc.exists) {
                container.innerHTML = '<div class="empty-state">❌ البطولة غير موجودة</div>';
                return;
            }
            const t = { id: doc.id, ...doc.data() };
            container.innerHTML = `
                <div class="tournament-details-card">
                    <h1>🏆 ${escapeHtml(t.name)}</h1>
                    <div class="tournament-info-grid">
                        <div><strong>📌 النوع:</strong> ${t.type || 'غير محدد'}</div>
                        <div><strong>📂 التصنيف:</strong> ${t.category || 'غير محدد'}</div>
                        <div><strong>💰 الجائزة:</strong> ${t.prize?.toLocaleString() || 0} جنيه</div>
                        <div><strong>📅 تاريخ البدء:</strong> ${t.startDate ? new Date(t.startDate).toLocaleDateString('ar') : 'غير محدد'}</div>
                        <div><strong>📅 تاريخ الانتهاء:</strong> ${t.endDate ? new Date(t.endDate).toLocaleDateString('ar') : 'غير محدد'}</div>
                        <div><strong>👥 المشاركون:</strong> ${t.participants?.length || 0}/${t.maxParticipants || 50}</div>
                    </div>
                    <div class="participants-list">
                        <h3>👥 قائمة المشاركين</h3>
                        ${t.participants?.length > 0 ? t.participants.map(p => `<div>${getUserNameById(p)}</div>`).join('') : '<p>لا يوجد مشاركون بعد</p>'}
                    </div>
                    ${t.status === 'active' ? `<button onclick="joinTournament('${t.id}')" class="btn-primary">🚀 انضم إلى البطولة</button>` : `<button class="btn-secondary" disabled>${t.status === 'completed' ? '🏁 انتهت البطولة' : '⏰ قريباً'}</button>`}
                    <button onclick="window.location.href='battles.html'" class="btn-secondary">← العودة للبطولات</button>
                </div>
            `;
        })
        .catch(error => {
            console.error(error);
            container.innerHTML = '<div class="empty-state">⚠️ حدث خطأ</div>';
        });
}

function joinTournament(tournamentId) {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    tournamentRef.get()
        .then(doc => {
            if (!doc.exists) return;
            const tournament = doc.data();
            if (tournament.status !== 'active') {
                showToast('⏰ البطولة غير نشطة حالياً', 'error');
                return;
            }
            if (tournament.participants?.includes(currentUser.id)) {
                showToast('⚠️ أنت مشترك بالفعل', 'info');
                return;
            }
            return tournamentRef.update({
                participants: firebase.firestore.FieldValue.arrayUnion(currentUser.id)
            });
        })
        .then(() => {
            showToast('✅ تم الانضمام إلى البطولة بنجاح!');
            loadTournaments();
            addUserPoints(currentUser.id, 20);
        })
        .catch(error => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function createTournament() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('⚠️ غير مصرح لك - هذه الخاصية للمشرفين فقط', 'error');
        return;
    }
    
    const name = document.getElementById('tournamentName')?.value;
    const type = document.getElementById('tournamentType')?.value;
    const category = document.getElementById('tournamentCategory')?.value;
    const prize = document.getElementById('tournamentPrize')?.value;
    const startDate = document.getElementById('tournamentStartDate')?.value;
    const endDate = document.getElementById('tournamentEndDate')?.value;
    
    if (!name || !prize || !startDate || !endDate) {
        showToast('❌ يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    db.collection('tournaments').add({
        name: name,
        type: type,
        category: category,
        prize: parseInt(prize),
        startDate: startDate,
        endDate: endDate,
        participants: [],
        maxParticipants: 50,
        status: 'upcoming',
        winner: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showToast('✅ تم إنشاء البطولة بنجاح!');
        closeTournamentModal();
        loadTournaments();
        if (document.getElementById('adminContent')) loadAdminPanel();
        
        // تفريغ الحقول
        document.getElementById('tournamentName').value = '';
        document.getElementById('tournamentPrize').value = '';
        document.getElementById('tournamentStartDate').value = '';
        document.getElementById('tournamentEndDate').value = '';
    }).catch(error => {
        console.error(error);
        showToast('❌ حدث خطأ في إنشاء البطولة', 'error');
    });
}

function loadWeeklyBattle() {
    db.collection('settings').doc('weeklyBattle').get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                document.getElementById('weeklyBattleTopic') && (document.getElementById('weeklyBattleTopic').innerText = data.topic || "✍️ اكتب 4 أبيات عن 'الحرية'");
                document.getElementById('weeklyParticipants') && (document.getElementById('weeklyParticipants').innerHTML = `👥 عدد المشاركين: ${data.participants?.length || 0}`);
            } else {
                document.getElementById('weeklyBattleTopic') && (document.getElementById('weeklyBattleTopic').innerText = "✍️ اكتب 4 أبيات عن 'الحرية'");
                document.getElementById('weeklyParticipants') && (document.getElementById('weeklyParticipants').innerHTML = '👥 عدد المشاركين: 0');
            }
        })
        .catch(error => console.warn(error));
}

function joinWeeklyBattle() {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const battleRef = db.collection('settings').doc('weeklyBattle');
    battleRef.get()
        .then(doc => {
            let participants = doc.exists ? (doc.data().participants || []) : [];
            if (participants.includes(currentUser.id)) {
                showToast('⚠️ أنت مشترك بالفعل', 'info');
                return;
            }
            participants.push(currentUser.id);
            return battleRef.set({ participants: participants, topic: "✍️ اكتب 4 أبيات عن 'الحرية'" }, { merge: true });
        })
        .then(() => {
            showToast('🎉 تم الاشتراك في المسابقة الأسبوعية!');
            loadWeeklyBattle();
            addUserPoints(currentUser.id, 15);
        })
        .catch(error => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

// ========== 14. نوافذ منبثقة للبطولات ==========
function openTournamentModal() {
    const modal = document.getElementById('tournamentModal');
    if (modal) modal.style.display = 'flex';
}

function closeTournamentModal() {
    const modal = document.getElementById('tournamentModal');
    if (modal) modal.style.display = 'none';
}

// ========== 15. البييتات ==========
function loadBeats(filter = 'all') {
    const container = document.getElementById('beatsGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    let query = db.collection('beats').orderBy('createdAt', 'desc');
    if (filter !== 'all') query = query.where('genre', '==', filter);
    
    query.get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-headphones"></i><p>لا توجد بييتات</p><button onclick="openBeatModal()" class="btn-primary">رفع بييتة</button></div>';
                return;
            }
            const beats = [];
            snapshot.forEach(doc => beats.push({ id: doc.id, ...doc.data() }));
            container.innerHTML = beats.map(beat => `
                <div class="beat-card">
                    <div class="beat-image"><i class="fas fa-headphones"></i></div>
                    <h3>${escapeHtml(beat.title)}</h3>
                    <p>🎵 ${beat.genre} | 🎚️ ${beat.bpm} BPM</p>
                    <p>💰 ${beat.price} جنيه</p>
                    <p>👤 ${escapeHtml(beat.uploaderName)} | ❤️ ${beat.likes || 0}</p>
                    <audio controls src="${beat.audioUrl || ''}" style="width:100%; margin:10px 0"></audio>
                    <div class="payment-buttons">
                        <button onclick="payBeat('${beat.id}', 'vodafone')" class="pay-btn">💳 فودافون كاش</button>
                        <button onclick="payBeat('${beat.id}', 'instapay')" class="pay-btn">🏦 إنستا باي</button>
                    </div>
                    ${currentUser?.id === beat.uploaderId || currentUser?.role === 'admin' ? `<button onclick="deleteBeat('${beat.id}')" class="delete-beat">🗑️ حذف</button>` : ''}
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function uploadBeat() {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        return;
    }
    
    const title = document.getElementById('beatTitle')?.value;
    const genre = document.getElementById('beatGenre')?.value;
    const bpm = document.getElementById('beatBpm')?.value;
    const price = document.getElementById('beatPrice')?.value;
    const file = document.getElementById('beatAudio')?.files[0];
    
    if (!title || !genre || !bpm || !price) {
        showToast('❌ يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    let audioUrl = '';
    if (file) audioUrl = URL.createObjectURL(file);
    
    db.collection('beats').add({
        title: title,
        genre: genre,
        bpm: parseInt(bpm),
        price: parseInt(price),
        audioUrl: audioUrl,
        uploaderId: currentUser.id,
        uploaderName: currentUser.name,
        likes: 0,
        plays: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showToast('✅ تم رفع البييتة بنجاح 🎧');
        closeBeatModal();
        loadBeats();
        addUserPoints(currentUser.id, 25);
    }).catch((error) => {
        console.error(error);
        showToast('❌ حدث خطأ', 'error');
    });
}

function deleteBeat(beatId) {
    if (!confirm('هل أنت متأكد من حذف هذه البييتة؟')) return;
    
    db.collection('beats').doc(beatId).delete()
        .then(() => {
            showToast('✅ تم الحذف');
            loadBeats();
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function payBeat(beatId, method) {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        return;
    }
    showToast(`💰 جاري التحويل عبر ${method}... (واجهة تجريبية)`);
}

// ========== 16. الميمز ==========
function loadMemes() {
    const container = document.getElementById('memesGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    db.collection('memes').orderBy('createdAt', 'desc').get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-grin-tongue-squint"></i><p>لا توجد ميمز</p><button onclick="openMemeModal()" class="btn-primary">أضف ميم</button></div>';
                return;
            }
            const memes = [];
            snapshot.forEach(doc => memes.push({ id: doc.id, ...doc.data() }));
            container.innerHTML = memes.map(meme => `
                <div class="meme-card">
                    <div class="meme-image">${meme.imageUrl ? `<img src="${meme.imageUrl}" style="max-width:100%; border-radius:10px">` : '<i class="fas fa-image" style="font-size:3rem"></i>'}</div>
                    <h3>${escapeHtml(meme.title)}</h3>
                    <p>${escapeHtml(meme.text)}</p>
                    <div class="meme-meta">
                        <span>👤 ${escapeHtml(meme.uploaderName)}</span>
                        <span>❤️ ${meme.likes || 0}</span>
                        <button onclick="likeMeme('${meme.id}')" class="like-meme"><i class="fas fa-heart"></i></button>
                    </div>
                    ${currentUser?.id === meme.uploaderId || currentUser?.role === 'admin' ? `<button onclick="deleteMeme('${meme.id}')" class="delete-meme">🗑️ حذف</button>` : ''}
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function likeMeme(memeId) {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        return;
    }
    
    db.collection('memes').doc(memeId).update({
        likes: firebase.firestore.FieldValue.increment(1)
    }).then(() => {
        showToast('👍');
        loadMemes();
    }).catch((error) => {
        console.error(error);
        showToast('❌ حدث خطأ', 'error');
    });
}

function uploadMeme() {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        return;
    }
    
    const title = document.getElementById('memeTitle')?.value;
    const text = document.getElementById('memeText')?.value;
    const file = document.getElementById('memeImage')?.files[0];
    
    if (!title || !text) {
        showToast('❌ يرجى إدخال العنوان والنص', 'error');
        return;
    }
    
    let imageUrl = '';
    if (file) imageUrl = URL.createObjectURL(file);
    
    db.collection('memes').add({
        title: title,
        text: text,
        imageUrl: imageUrl,
        uploaderId: currentUser.id,
        uploaderName: currentUser.name,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        showToast('✅ تم نشر الميم 😂');
        closeMemeModal();
        loadMemes();
        addUserPoints(currentUser.id, 5);
    }).catch((error) => {
        console.error(error);
        showToast('❌ حدث خطأ', 'error');
    });
}

function deleteMeme(memeId) {
    if (!confirm('هل أنت متأكد من حذف هذا الميم؟')) return;
    
    db.collection('memes').doc(memeId).delete()
        .then(() => {
            showToast('✅ تم الحذف');
            loadMemes();
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

// ========== 17. المحادثات ==========
function loadChatList() {
    const container = document.getElementById('chatList');
    if (!container) return;
    
    db.collection('chats').doc('groups').get()
        .then((doc) => {
            const groups = doc.exists ? doc.data().groups || [] : [];
            if (groups.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>لا توجد مجموعات</p><button onclick="openCreateGroupModal()" class="btn-primary">إنشاء مجموعة جديدة</button></div>';
                return;
            }
            container.innerHTML = groups.map(g => `
                <div class="chat-list-item" onclick="openChat('group_${g.id}')">
                    <div class="chat-avatar">👥</div>
                    <div class="chat-info">
                        <div class="chat-name">${escapeHtml(g.name)}</div>
                        <div class="chat-last-msg">${escapeHtml(g.lastMessage || '')}</div>
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => console.error(error));
}

function openChat(chatId) {
    currentChatId = chatId;
    const header = document.getElementById('chatHeader');
    if (header) header.innerHTML = `<h4>${chatId.startsWith('group_') ? '💬 مجموعة' : '💬 محادثة خاصة'}</h4>`;
    loadMessages();
}

function loadMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !currentChatId) return;
    
    if (currentChatId.startsWith('group_')) {
        const groupId = currentChatId.replace('group_', '');
        db.collection('chats').doc('groups').get()
            .then((doc) => {
                if (doc.exists) {
                    const groups = doc.data().groups || [];
                    const group = groups.find(g => g.id === groupId);
                    const messages = group ? group.messages || [] : [];
                    if (messages.length === 0) {
                        container.innerHTML = '<div class="empty-state"><i class="fas fa-comments"></i><p>لا توجد رسائل بعد</p><p>كن أول من يكتب!</p></div>';
                        return;
                    }
                    container.innerHTML = messages.map(msg => `
                        <div class="message ${msg.senderId === currentUser?.id ? 'sent' : 'received'}">
                            <div class="message-bubble">
                                <strong>${msg.senderId === currentUser?.id ? 'أنت' : escapeHtml(msg.senderName || 'مستخدم')}</strong>
                                <p>${escapeHtml(msg.text)}</p>
                                <div class="message-time">${new Date(msg.time).toLocaleTimeString('ar')}</div>
                            </div>
                        </div>
                    `).join('');
                    container.scrollTop = container.scrollHeight;
                }
            })
            .catch((error) => console.error(error));
    }
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    if (!input || !input.value.trim() || !currentChatId || !currentUser) return;
    
    const message = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: input.value.trim(),
        time: new Date().toISOString()
    };
    
    if (currentChatId.startsWith('group_')) {
        const groupId = currentChatId.replace('group_', '');
        db.collection('chats').doc('groups').get()
            .then((doc) => {
                let groups = doc.exists ? doc.data().groups || [] : [];
                const groupIndex = groups.findIndex(g => g.id === groupId);
                if (groupIndex !== -1) {
                    if (!groups[groupIndex].messages) groups[groupIndex].messages = [];
                    groups[groupIndex].messages.push(message);
                    groups[groupIndex].lastMessage = message.text.substring(0, 30);
                    db.collection('chats').doc('groups').set({ groups: groups });
                    input.value = '';
                    loadMessages();
                    loadChatList();
                }
            })
            .catch((error) => console.error(error));
    }
}

function createGroup() {
    if (!currentUser) {
        showToast('⚠️ سجل الدخول أولاً', 'error');
        return;
    }
    
    const name = document.getElementById('groupName')?.value;
    if (!name) {
        showToast('❌ يرجى إدخال اسم المجموعة', 'error');
        return;
    }
    
    db.collection('chats').doc('groups').get()
        .then((doc) => {
            let groups = doc.exists ? doc.data().groups || [] : [];
            const newGroup = {
                id: 'g' + Date.now(),
                name: name,
                description: document.getElementById('groupDescription')?.value || '',
                type: document.getElementById('groupType')?.value || 'public',
                members: [currentUser.id],
                messages: [],
                lastMessage: '',
                createdAt: new Date().toISOString()
            };
            groups.push(newGroup);
            db.collection('chats').doc('groups').set({ groups: groups });
            showToast('✅ تم إنشاء المجموعة بنجاح');
            closeCreateGroupModal();
            loadChatList();
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function openCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    if (modal) modal.style.display = 'flex';
}

function closeCreateGroupModal() {
    const modal = document.getElementById('createGroupModal');
    if (modal) modal.style.display = 'none';
}

// ========== 18. الهاشتاجات والترند والاستكشاف ==========
function loadHashtagPage() {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get('tag');
    if (!tag) return;
    
    const titleEl = document.getElementById('hashtagName');
    const countEl = document.getElementById('hashtagCount');
    const container = document.getElementById('hashtagPosts');
    
    if (titleEl) titleEl.innerText = tag;
    
    db.collection('stories').get()
        .then((snapshot) => {
            const filtered = [];
            snapshot.forEach(doc => {
                const story = doc.data();
                if (story.hashtags && story.hashtags.includes(tag)) {
                    filtered.push({ id: doc.id, ...story });
                }
            });
            if (countEl) countEl.innerHTML = `${filtered.length} منشور`;
            if (!container) return;
            
            if (filtered.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-hashtag"></i><p>لا توجد منشورات بهذا الهاشتاج</p></div>';
                return;
            }
            
            container.innerHTML = filtered.map(story => `
                <div class="post-card" onclick="viewStory('${story.id}')">
                    <div class="post-header">
                        <div class="post-avatar">${story.authorAvatar}</div>
                        <div>
                            <strong>${escapeHtml(story.authorName)}</strong>
                            <div class="post-category">${story.category}</div>
                        </div>
                    </div>
                    <div class="post-content">
                        <h4>${escapeHtml(story.title)}</h4>
                        <p>${escapeHtml(story.content.substring(0, 100))}...</p>
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            if (container) container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function loadExplore() {
    const container = document.getElementById('exploreContent');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    db.collection('stories').orderBy('createdAt', 'desc').get()
        .then((snapshot) => {
            const stories = [];
            snapshot.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));
            if (stories.length === 0) {
                container.innerHTML = '<div class="empty-state"><p>لا توجد منشورات</p></div>';
                return;
            }
            container.innerHTML = stories.map(story => `
                <div class="post-card" onclick="viewStory('${story.id}')">
                    <div class="post-header">
                        <div class="post-avatar">${story.authorAvatar}</div>
                        <div>
                            <strong>${escapeHtml(story.authorName)}</strong>
                            <div class="post-category">${story.category}</div>
                        </div>
                    </div>
                    <div class="post-content">
                        <h4>${escapeHtml(story.title)}</h4>
                        <p>${escapeHtml(story.content.substring(0, 100))}...</p>
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function searchExplore() {
    const searchTerm = document.getElementById('exploreSearchInput')?.value.toLowerCase();
    if (!searchTerm) {
        loadExplore();
        return;
    }
    
    const container = document.getElementById('exploreContent');
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري البحث...</p></div>';
    
    db.collection('stories').get()
        .then((snapshot) => {
            const filtered = [];
            snapshot.forEach(doc => {
                const story = doc.data();
                if (story.title?.toLowerCase().includes(searchTerm) ||
                    story.content?.toLowerCase().includes(searchTerm) ||
                    story.authorName?.toLowerCase().includes(searchTerm)) {
                    filtered.push({ id: doc.id, ...story });
                }
            });
            if (filtered.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>لا توجد نتائج</p></div>';
                return;
            }
            container.innerHTML = filtered.map(story => `
                <div class="post-card" onclick="viewStory('${story.id}')">
                    <div class="post-header">
                        <div class="post-avatar">${story.authorAvatar}</div>
                        <div>
                            <strong>${escapeHtml(story.authorName)}</strong>
                            <div>${escapeHtml(story.title)}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function loadTrending() {
    const container = document.getElementById('trendingContent');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    Promise.all([
        db.collection('stories').orderBy('views', 'desc').limit(10).get(),
        db.collection('stories').get()
    ]).then(([topStories, allStories]) => {
        const trendingPosts = [];
        topStories.forEach(doc => trendingPosts.push({ id: doc.id, ...doc.data() }));
        
        const hashtagCount = {};
        allStories.forEach(doc => {
            const story = doc.data();
            if (story.hashtags) {
                story.hashtags.forEach(tag => {
                    hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
                });
            }
        });
        const trendingHashtags = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
        
        const topWriters = [];
        const writerStats = {};
        allStories.forEach(doc => {
            const story = doc.data();
            if (story.authorId) {
                if (!writerStats[story.authorId]) {
                    writerStats[story.authorId] = { name: story.authorName, count: 0, likes: 0 };
                }
                writerStats[story.authorId].count++;
                writerStats[story.authorId].likes += (story.likes || 0);
            }
        });
        Object.entries(writerStats).forEach(([id, data]) => {
            topWriters.push({ id, ...data });
        });
        topWriters.sort((a, b) => b.likes - a.likes);
        
        container.innerHTML = `
            <div class="trending-list">
                <h3>📈 الأكثر قراءة هذا الأسبوع</h3>
                ${trendingPosts.map((s, i) => `
                    <div class="trending-item">
                        <div class="trending-rank">${i+1}</div>
                        <div class="trending-info">
                            <div class="trending-title" onclick="viewStory('${s.id}')">${escapeHtml(s.title)}</div>
                            <div class="trending-meta">👁️ ${s.views || 0} مشاهدة • ❤️ ${s.likes || 0} إعجاب</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="trending-hashtags">
                <h3>🔥 الهاشتاجات الرائجة</h3>
                <div class="hashtags-cloud">
                    ${trendingHashtags.map(([tag, count]) => `<a href="hashtag.html?tag=${encodeURIComponent(tag)}" class="trending-hashtag">#${escapeHtml(tag)} <span class="hashtag-count">${count}</span></a>`).join('')}
                </div>
            </div>
            <div class="top-writers">
                <h3>👑 نجوم الأسبوع</h3>
                ${topWriters.slice(0, 5).map((w, i) => `
                    <div class="trending-item">
                        <div class="trending-rank">${i+1}</div>
                        <div class="trending-info">
                            <div class="trending-title">${escapeHtml(w.name)}</div>
                            <div class="trending-meta">✍️ ${w.count} كتابة • ❤️ ${w.likes} إعجاب</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }).catch((error) => {
        console.error(error);
        container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
    });
}

// ========== 19. لوحة التحكم ==========
function loadAdminPanel() {
    const isAdmin = currentUser && (currentUser.role === 'admin');
    const container = document.getElementById('adminContent');
    if (!container) return;
    
    if (!isAdmin) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center; padding:50px">
                <i class="fas fa-shield-alt" style="font-size:50px; color:#e94560"></i>
                <h3>⛔ غير مصرح بالدخول</h3>
                <p>هذه الصفحة مخصصة للمشرفين فقط</p>
                <a href="login.html" class="btn-primary">تسجيل الدخول كمشرف</a>
            </div>
        `;
        const createBtn = document.getElementById('createTournamentBtn');
        if (createBtn) createBtn.style.display = 'none';
        return;
    }
    
    const createBtn = document.getElementById('createTournamentBtn');
    if (createBtn) createBtn.style.display = 'inline-flex';
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    Promise.all([
        db.collection('users').get(),
        db.collection('stories').get(),
        db.collection('reports').get(),
        db.collection('tournaments').get()
    ]).then(([usersSnapshot, storiesSnapshot, reportsSnapshot, tournamentsSnapshot]) => {
        const users = [];
        usersSnapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        const reports = [];
        reportsSnapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
        const tournaments = [];
        tournamentsSnapshot.forEach(doc => tournaments.push({ id: doc.id, ...doc.data() }));
        
        container.innerHTML = `
            <div class="admin-stats">
                <div class="admin-stat-card"><div class="admin-stat-number">${users.length}</div><div>👥 مستخدم</div></div>
                <div class="admin-stat-card"><div class="admin-stat-number">${storiesSnapshot.size}</div><div>📝 منشور</div></div>
                <div class="admin-stat-card"><div class="admin-stat-number">${tournaments.length}</div><div>🏆 بطولة</div></div>
                <div class="admin-stat-card"><div class="admin-stat-number">${reports.length}</div><div>🚨 بلاغ</div></div>
            </div>
            
            <div class="admin-section">
                <h3>👥 إدارة المستخدمين</h3>
                <div class="admin-users-list">
                    ${users.map(u => `
                        <div class="admin-user-item">
                            <div><strong>${escapeHtml(u.name)}</strong><br><small>${u.email} • ${u.role}</small></div>
                            <div>
                                <select onchange="changeUserRole('${u.id}', this.value)" class="admin-role-select">
                                    <option ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                                    <option ${u.role === 'moderator' ? 'selected' : ''}>moderator</option>
                                    <option ${u.role === 'user' ? 'selected' : ''}>user</option>
                                </select>
                                <button onclick="banUser('${u.id}')" class="admin-ban-btn">⛔ حظر</button>
                                <button onclick="deleteUserAccount('${u.id}')" class="admin-delete-btn">🗑️ حذف</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button onclick="openTournamentModal()" class="btn-primary" style="margin-top:15px"><i class="fas fa-plus"></i> إنشاء بطولة جديدة</button>
            </div>
            
            <div class="admin-section">
                <h3>🚨 البلاغات (${reports.length})</h3>
                <div class="admin-reports-list">
                    ${reports.map(r => `
                        <div class="admin-report-item">
                            <div>📢 بلاغ على منشور: ${r.storyId}</div>
                            <div>👤 من: ${escapeHtml(r.userName)}</div>
                            <div>📝 السبب: ${escapeHtml(r.reason)}</div>
                            <div><button onclick="resolveReport('${r.id}')" class="admin-approve-btn">✅ تم الحل</button></div>
                        </div>
                    `).join('') || '<p>لا توجد بلاغات</p>'}
                </div>
            </div>
            
            <div class="admin-section">
                <h3>🏆 البطولات</h3>
                <div class="admin-tournaments-list">
                    ${tournaments.map(t => `
                        <div class="admin-tournament-item">
                            <div><strong>${escapeHtml(t.name)}</strong><br>${t.type} • ${t.status}</div>
                            <div>
                                <button onclick="editTournamentAdmin('${t.id}')" class="admin-edit-btn">✏️ تعديل</button>
                                <button onclick="deleteTournamentAdmin('${t.id}')" class="admin-delete-btn">🗑️ حذف</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).catch((error) => {
        console.error(error);
        container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
    });
}

function changeUserRole(userId, newRole) {
    db.collection('users').doc(userId).update({ role: newRole })
        .then(() => {
            showToast('✅ تم تحديث صلاحية المستخدم');
            loadAdminPanel();
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function banUser(userId) {
    if (confirm('هل تريد حظر هذا المستخدم؟')) {
        showToast('⛔ تم حظر المستخدم');
    }
}

function deleteUserAccount(userId) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) {
        db.collection('users').doc(userId).delete()
            .then(() => {
                showToast('✅ تم حذف المستخدم');
                loadAdminPanel();
                updateStats();
            })
            .catch((error) => {
                console.error(error);
                showToast('❌ حدث خطأ', 'error');
            });
    }
}

function resolveReport(reportId) {
    db.collection('reports').doc(reportId).delete()
        .then(() => {
            showToast('✅ تم حل البلاغ');
            loadAdminPanel();
        })
        .catch((error) => {
            console.error(error);
            showToast('❌ حدث خطأ', 'error');
        });
}

function editTournamentAdmin(tournamentId) {
    showToast('✏️ واجهة تعديل البطولة (قيد التطوير)');
}

function deleteTournamentAdmin(tournamentId) {
    if (confirm('هل تريد حذف هذه البطولة؟')) {
        db.collection('tournaments').doc(tournamentId).delete()
            .then(() => {
                showToast('✅ تم حذف البطولة');
                loadAdminPanel();
                loadTournaments();
            })
            .catch((error) => {
                console.error(error);
                showToast('❌ حدث خطأ', 'error');
            });
    }
}

// ========== 20. صفحة الملف الشخصي ==========
async function loadProfile() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('profileName').innerText = currentUser.name;
    document.getElementById('profileEmail').innerText = currentUser.email;
    
    const avatarEl = document.getElementById('profileAvatar');
    if (currentUser.avatarUrl) {
        avatarEl.innerHTML = `<img src="${currentUser.avatarUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
        avatarEl.innerText = currentUser.avatar || '👤';
    }
    
    const storiesSnap = await db.collection('stories').where('authorId', '==', currentUser.id).get();
    document.getElementById('storiesCountProfile').innerText = storiesSnap.size;
    document.getElementById('followersCount').innerText = currentUser.followers?.length || 0;
    document.getElementById('followingCount').innerText = currentUser.following?.length || 0;
    
    const badgesContainer = document.getElementById('profileBadges');
    if (badgesContainer && currentUser.badges) {
        badgesContainer.innerHTML = currentUser.badges.map(b => `<span class="badge">${b}</span>`).join('');
    }
    
    loadProfilePosts();
    initAvatarUpload();
}

async function loadProfilePosts() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    const storiesSnap = await db.collection('stories').where('authorId', '==', currentUser.id).orderBy('createdAt', 'desc').get();
    if (storiesSnap.empty) {
        container.innerHTML = '<div class="empty-state">لا توجد منشورات بعد</div>';
        return;
    }
    
    const stories = [];
    storiesSnap.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));
    
    container.innerHTML = stories.map(story => `
        <div class="post-card" onclick="viewStory('${story.id}')">
            <div class="post-header">
                <div class="post-avatar">${story.authorAvatar}</div>
                <div><strong>${escapeHtml(story.title)}</strong><div class="post-category">${story.category}</div></div>
            </div>
            <div class="post-content"><p>${escapeHtml(story.content.substring(0, 100))}...</p></div>
            <div class="post-stats">
                <span>❤️ ${story.likes || 0}</span>
                <span>👁️ ${story.views || 0}</span>
            </div>
        </div>
    `).join('');
}

function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: `${currentUser.name} | قلم ومايك`,
            text: `تعرف على ملف ${currentUser.name} الشخصي على منصة قلم ومايك`,
            url: url
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url);
        showToast('🔗 تم نسخ رابط الملف الشخصي');
    }
}

async function uploadProfileAvatar(file) {
    if (!currentUser) return;
    
    const storageRef = firebase.storage().ref();
    const avatarRef = storageRef.child(`avatars/${currentUser.id}`);
    
    try {
        const snapshot = await avatarRef.put(file);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        await db.collection('users').doc(currentUser.id).update({
            avatarUrl: downloadURL,
            avatar: '🖼️'
        });
        
        currentUser.avatarUrl = downloadURL;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        const avatarEl = document.getElementById('profileAvatar');
        if (avatarEl) {
            avatarEl.innerHTML = `<img src="${downloadURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        }
        
        showToast('✅ تم تحديث الصورة الشخصية');
        return downloadURL;
    } catch (error) {
        console.error(error);
        showToast('❌ فشل رفع الصورة', 'error');
    }
}

function initAvatarUpload() {
    const avatarInput = document.getElementById('avatarUpload');
    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                await uploadProfileAvatar(file);
            } else {
                showToast('❌ يرجى اختيار ملف صورة صالح', 'error');
            }
        });
    }
}

// ========== 21. صفحة الإعدادات ==========
function loadSettings() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('settingsName').value = currentUser.name || '';
    document.getElementById('settingsEmail').value = currentUser.email || '';
    if (currentUser.country) {
        document.getElementById('settingsCountry').value = currentUser.country;
    }
    document.getElementById('settingsAvatar').innerText = currentUser.avatar || '👤';
    
    document.getElementById('notifyLikes') && (document.getElementById('notifyLikes').checked = localStorage.getItem('notifyLikes') === 'true');
    document.getElementById('notifyComments') && (document.getElementById('notifyComments').checked = localStorage.getItem('notifyComments') === 'true');
    document.getElementById('notifyTournaments') && (document.getElementById('notifyTournaments').checked = localStorage.getItem('notifyTournaments') === 'true');
    document.getElementById('notifyMessages') && (document.getElementById('notifyMessages').checked = localStorage.getItem('notifyMessages') === 'true');
}

function saveSettings() {
    if (!currentUser) return;
    
    const newName = document.getElementById('settingsName').value;
    const newCountry = document.getElementById('settingsCountry').value;
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmNewPassword = document.getElementById('confirmNewPassword')?.value;
    
    const updateData = {};
    if (newName && newName !== currentUser.name) updateData.name = newName;
    if (newCountry && newCountry !== currentUser.country) updateData.country = newCountry;
    
    if (Object.keys(updateData).length > 0) {
        db.collection('users').doc(currentUser.id).update(updateData)
            .then(() => {
                currentUser = { ...currentUser, ...updateData };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showToast('✅ تم تحديث الملف الشخصي');
            })
            .catch(e => showToast('❌ حدث خطأ', 'error'));
    }
    
    if (newPassword && newPassword === confirmNewPassword) {
        const user = auth.currentUser;
        if (user && currentPassword) {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            user.reauthenticateWithCredential(credential)
                .then(() => user.updatePassword(newPassword))
                .then(() => {
                    showToast('✅ تم تغيير كلمة المرور');
                    document.getElementById('currentPassword').value = '';
                    document.getElementById('newPassword').value = '';
                    document.getElementById('confirmNewPassword').value = '';
                })
                .catch(() => showToast('❌ كلمة المرور الحالية غير صحيحة', 'error'));
        }
    } else if (newPassword) {
        showToast('❌ كلمة المرور الجديدة غير متطابقة', 'error');
    }
    
    localStorage.setItem('notifyLikes', document.getElementById('notifyLikes')?.checked || false);
    localStorage.setItem('notifyComments', document.getElementById('notifyComments')?.checked || false);
    localStorage.setItem('notifyTournaments', document.getElementById('notifyTournaments')?.checked || false);
    localStorage.setItem('notifyMessages', document.getElementById('notifyMessages')?.checked || false);
    showToast('✅ تم حفظ الإعدادات');
}

function changeAvatar() {
    const avatars = ['👤', '👨', '👩', '🧑', '👨‍💻', '👩‍🎤', '🎙️', '📝', '✍️', '🎧', '🎵', '⭐', '🔥', '💪', '🎯', '🌟', '✨', '💎', '🏆', '🎨'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    db.collection('users').doc(currentUser.id).update({ avatar: randomAvatar })
        .then(() => {
            currentUser.avatar = randomAvatar;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            document.getElementById('settingsAvatar').innerText = randomAvatar;
            showToast('✅ تم تغيير الصورة الرمزية');
        })
        .catch(e => showToast('❌ حدث خطأ', 'error'));
}

function deleteAccount() {
    if (!confirm('⚠️ هل أنت متأكد من حذف حسابك نهائياً؟\nسيتم حذف جميع بياناتك ولن يمكن استعادتها!')) return;
    
    const user = auth.currentUser;
    if (user) {
        db.collection('users').doc(user.uid).delete()
            .then(() => user.delete())
            .then(() => {
                localStorage.clear();
                showToast('✅ تم حذف الحساب');
                setTimeout(() => { window.location.href = 'index.html'; }, 1500);
            })
            .catch((error) => {
                console.error(error);
                showToast('❌ حدث خطأ، يرجى إعادة تسجيل الدخول والمحاولة مرة أخرى', 'error');
            });
    }
}

// ========== 22. الإشعارات ==========
function loadNotifications() {
    const container = document.getElementById('notificationsPageContent');
    if (!container) return;
    
    if (!currentUser) {
        container.innerHTML = '<div class="empty-state"><p>سجل الدخول لمشاهدة الإشعارات</p><a href="login.html" class="btn-primary">تسجيل الدخول</a></div>';
        return;
    }
    
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    
    db.collection('notifications').where('userId', '==', currentUser.id).orderBy('createdAt', 'desc').get()
        .then((snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>لا توجد إشعارات</p></div>';
                return;
            }
            const notifications = [];
            snapshot.forEach(doc => notifications.push({ id: doc.id, ...doc.data() }));
            container.innerHTML = notifications.map(n => `
                <div class="notification-item ${!n.read ? 'unread' : ''}" onclick="markNotificationRead('${n.id}')">
                    <div class="notification-icon">${n.title.includes('🏆') ? '🏆' : (n.title.includes('❤️') ? '❤️' : '🔔')}</div>
                    <div class="notification-content">
                        <div class="notification-title">${escapeHtml(n.title)}</div>
                        <div class="notification-body">${escapeHtml(n.body)}</div>
                        <div class="notification-time">${n.createdAt ? timeAgo(n.createdAt) : ''}</div>
                    </div>
                </div>
            `).join('');
        })
        .catch((error) => {
            console.error(error);
            container.innerHTML = '<div class="empty-state"><p>حدث خطأ</p></div>';
        });
}

function markNotificationRead(notificationId) {
    db.collection('notifications').doc(notificationId).update({ read: true })
        .then(() => loadNotifications())
        .catch((error) => console.error(error));
}

function addNotification(title, body) {
    if (!currentUser) return;
    db.collection('notifications').add({
        userId: currentUser.id,
        title: title,
        body: body,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.warn(e));
}

// ========== 23. البحث ==========
function setupSearch() {
    const searchBtn = document.getElementById('searchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchInput = document.getElementById('searchInput');
    const closeSearch = document.getElementById('closeSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchBtn || !searchModal) return;
    
    searchBtn.onclick = () => searchModal.classList.add('active');
    if (closeSearch) closeSearch.onclick = () => searchModal.classList.remove('active');
    searchModal.onclick = (e) => { if (e.target === searchModal) searchModal.classList.remove('active'); };
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            if (term.length < 2) {
                searchResults.innerHTML = '';
                return;
            }
            
            db.collection('stories').get()
                .then((snapshot) => {
                    const filtered = [];
                    snapshot.forEach(doc => {
                        const story = doc.data();
                        if (story.title?.toLowerCase().includes(term) ||
                            story.content?.toLowerCase().includes(term) ||
                            story.authorName?.toLowerCase().includes(term)) {
                            filtered.push({ id: doc.id, title: story.title, authorName: story.authorName });
                        }
                    });
                    
                    searchResults.innerHTML = filtered.map(s => `
                        <div class="search-result" onclick="viewStory('${s.id}'); document.getElementById('searchModal').classList.remove('active')">
                            <strong>${escapeHtml(s.title)}</strong>
                            <small>${escapeHtml(s.authorName)}</small>
                        </div>
                    `).join('');
                    
                    if (filtered.length === 0) searchResults.innerHTML = '<div class="search-empty">🔍 لا توجد نتائج</div>';
                })
                .catch((error) => {
                    console.error(error);
                    searchResults.innerHTML = '<div class="search-empty">⚠️ حدث خطأ</div>';
                });
        });
    }
}

// ========== 24. أزرار المشاركة ==========
function initShareButtons() {
    const shareFacebook = document.getElementById('shareFacebook');
    if (shareFacebook) {
        shareFacebook.addEventListener('click', function(e) {
            e.preventDefault();
            const url = encodeURIComponent(window.location.href);
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
        });
    }
    
    const shareTwitter = document.getElementById('shareTwitter');
    if (shareTwitter) {
        shareTwitter.addEventListener('click', function(e) {
            e.preventDefault();
            const url = encodeURIComponent(window.location.href);
            const text = encodeURIComponent(document.title);
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
        });
    }
    
    const shareWhatsapp = document.getElementById('shareWhatsapp');
    if (shareWhatsapp) {
        shareWhatsapp.addEventListener('click', function(e) {
            e.preventDefault();
            const url = encodeURIComponent(window.location.href);
            window.open(`https://wa.me/?text=${url}`, '_blank');
        });
    }
    
    const shareTelegram = document.getElementById('shareTelegram');
    if (shareTelegram) {
        shareTelegram.addEventListener('click', function(e) {
            e.preventDefault();
            const url = encodeURIComponent(window.location.href);
            window.open(`https://t.me/share/url?url=${url}`, '_blank', 'width=600,height=400');
        });
    }
    
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', function(e) {
            e.preventDefault();
            navigator.clipboard.writeText(window.location.href)
                .then(() => showToast('✅ تم نسخ الرابط'))
                .catch(() => showToast('❌ فشل نسخ الرابط', 'error'));
        });
    }
}

// ========== 25. نجوم الخلفية ==========
let starsArray = [];
let starCtx = null;
let starCanvas = null;

function initStars() {
    starCanvas = document.getElementById('starCanvas');
    if (!starCanvas) return;
    starCtx = starCanvas.getContext('2d');
    
    function resizeCanvas() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
        starsArray = [];
        for (let i = 0; i < 150; i++) {
            starsArray.push({
                x: Math.random() * starCanvas.width,
                y: Math.random() * starCanvas.height,
                r: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.3,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }
    
    function animateStars() {
        if (!starCtx || !starCanvas) return;
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        starsArray.forEach(star => {
            star.twinkle += 0.02;
            const alpha = star.alpha + Math.sin(star.twinkle) * 0.2;
            starCtx.beginPath();
            starCtx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
            starCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(0.9, alpha))})`;
            starCtx.fill();
        });
        requestAnimationFrame(animateStars);
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animateStars();
}

// ========== 26. كلمة اليوم ==========
function loadDailyWord() {
    db.collection('settings').doc('dailyWord').get()
        .then((doc) => {
            const today = new Date().toDateString();
            if (doc.exists && doc.data().date === today) {
                const daily = doc.data();
                document.getElementById('dailyWord') && (document.getElementById('dailyWord').innerText = daily.word);
                document.getElementById('dailyPrompt') && (document.getElementById('dailyPrompt').innerText = daily.prompt);
            } else {
                const wordsList = [
                    { word: 'الحرية ✨', prompt: 'اكتب عن شعورك بالحرية' },
                    { word: 'الحب 💕', prompt: 'صف أجمل لحظة حب' },
                    { word: 'الأمل 🌈', prompt: 'ما الذي يمنحك الأمل؟' },
                    { word: 'الوحدة 🌙', prompt: 'كيف تقضي وقتك عندما تكون وحيداً؟' },
                    { word: 'الصداقة 🤝', prompt: 'اكتب عن صديق العمر' },
                    { word: 'الإبداع 🎨', prompt: 'ما هو مصدر إلهامك؟' },
                    { word: 'النجاح 🏆', prompt: 'كيف تعرف النجاح؟' },
                    { word: 'السلام 🕊️', prompt: 'اكتب عن أهمية السلام' }
                ];
                const randomWord = wordsList[Math.floor(Math.random() * wordsList.length)];
                db.collection('settings').doc('dailyWord').set({ ...randomWord, date: today });
                document.getElementById('dailyWord') && (document.getElementById('dailyWord').innerText = randomWord.word);
                document.getElementById('dailyPrompt') && (document.getElementById('dailyPrompt').innerText = randomWord.prompt);
            }
        })
        .catch(e => console.warn(e));
}

function randomTopic() {
    const topics = [
        'اكتب عن الحرية', 'اكتب عن الحب', 'اكتب عن الأمل', 'اكتب عن الوحدة',
        'اكتب عن الصداقة', 'اكتب عن الحلم', 'اكتب عن النجاح', 'اكتب عن الفشل',
        'اكتب عن الشجاعة', 'اكتب عن الخوف', 'اكتب عن الغضب', 'اكتب عن الفرح'
    ];
    const random = topics[Math.floor(Math.random() * topics.length)];
    const prompt = document.getElementById('dailyPrompt');
    if (prompt) prompt.innerText = random;
    showToast(`📝 ${random}`);
}

// ========== 27. الوضع المظلم ==========
let darkModeLevel = localStorage.getItem('darkModeLevel') || 'dark';

function applyDarkMode() {
    const body = document.body;
    body.classList.remove('light-mode', 'dark-mode', 'mid-mode');
    
    if (darkModeLevel === 'light') {
        body.classList.add('light-mode');
        document.documentElement.style.setProperty('--bg-primary', '#f5f5f5');
        document.documentElement.style.setProperty('--bg-secondary', '#ffffff');
        document.documentElement.style.setProperty('--bg-card', '#ffffff');
        document.documentElement.style.setProperty('--text-primary', '#1a1a1a');
        document.documentElement.style.setProperty('--text-secondary', '#4a4a4a');
        document.documentElement.style.setProperty('--border-color', '#e0e0e0');
    } else if (darkModeLevel === 'mid') {
        body.classList.add('mid-mode');
        document.documentElement.style.setProperty('--bg-primary', '#1a1a2e');
        document.documentElement.style.setProperty('--bg-secondary', '#16213e');
        document.documentElement.style.setProperty('--bg-card', '#1f2a4a');
        document.documentElement.style.setProperty('--text-primary', '#eeeeee');
        document.documentElement.style.setProperty('--text-secondary', '#cccccc');
        document.documentElement.style.setProperty('--border-color', '#2a3a5a');
    } else {
        body.classList.add('dark-mode');
        document.documentElement.style.setProperty('--bg-primary', '#0a0a0a');
        document.documentElement.style.setProperty('--bg-secondary', '#111111');
        document.documentElement.style.setProperty('--bg-card', '#1a1a1a');
        document.documentElement.style.setProperty('--text-primary', '#ffffff');
        document.documentElement.style.setProperty('--text-secondary', '#a0a0a0');
        document.documentElement.style.setProperty('--border-color', '#2a2a2a');
    }
    
    const label = document.getElementById('darkModeLabel');
    if (label) label.innerText = darkModeLevel === 'light' ? 'نهاري' : (darkModeLevel === 'mid' ? 'متوسط' : 'ليلي');
    localStorage.setItem('darkModeLevel', darkModeLevel);
}

function cycleDarkMode() {
    if (darkModeLevel === 'dark') darkModeLevel = 'light';
    else if (darkModeLevel === 'light') darkModeLevel = 'mid';
    else darkModeLevel = 'dark';
    applyDarkMode();
}

// ========== 28. دوال النوافذ المنبثقة ==========
function openBeatModal() { const m = document.getElementById('beatModal'); if(m) m.style.display = 'flex'; }
function closeBeatModal() { const m = document.getElementById('beatModal'); if(m) m.style.display = 'none'; }
function openMemeModal() { const m = document.getElementById('memeModal'); if(m) m.style.display = 'flex'; }
function closeMemeModal() { const m = document.getElementById('memeModal'); if(m) m.style.display = 'none'; }

function copyEmail() {
    const email = document.getElementById('contactEmail')?.innerText;
    if (email) {
        navigator.clipboard.writeText(email);
        showToast('📧 تم نسخ البريد الإلكتروني');
    }
}

function shareSite() {
    if (navigator.share) {
        navigator.share({
            title: 'قلم ومايك',
            text: 'منصة الكلمة الحرة - راب، شعر، بطولات، ميمز',
            url: window.location.href
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('🔗 تم نسخ رابط الموقع');
    }
}

// ========== 29. التصفية والتبويبات ==========
function setupFilters() {
    // تصفية المنشورات
    const catTabs = document.querySelectorAll('.cat-tab');
    catTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadStories(tab.getAttribute('data-filter'));
        });
    });
    
    // تصفية البييتات
    const beatFilters = document.querySelectorAll('.filter-beat-btn');
    beatFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            beatFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            loadBeats(filter.getAttribute('data-beat'));
        });
    });
    
    // تبويبات البطولات
    const tournamentTabs = document.querySelectorAll('.tournament-tab');
    tournamentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tournamentTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const status = tab.getAttribute('data-status');
            const activeSec = document.getElementById('activeTournaments');
            const upcomingSec = document.getElementById('upcomingTournaments');
            const completedSec = document.getElementById('completedTournaments');
            if (activeSec) activeSec.style.display = status === 'active' ? 'block' : 'none';
            if (upcomingSec) upcomingSec.style.display = status === 'upcoming' ? 'block' : 'none';
            if (completedSec) completedSec.style.display = status === 'completed' ? 'block' : 'none';
        });
    });
    
    // تبويبات الاستكشاف
    const exploreTabs = document.querySelectorAll('.explore-tab');
    exploreTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            exploreTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const type = tab.getAttribute('data-explore');
            if (type === 'latest') loadExplore();
            else if (type === 'popular') {
                db.collection('stories').orderBy('likes', 'desc').limit(20).get()
                    .then(snapshot => {
                        const stories = [];
                        snapshot.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));
                        const container = document.getElementById('exploreContent');
                        if (container) {
                            container.innerHTML = stories.map(story => `
                                <div class="post-card" onclick="viewStory('${story.id}')">
                                    <div class="post-header">
                                        <div class="post-avatar">${story.authorAvatar}</div>
                                        <div><strong>${escapeHtml(story.authorName)}</strong><div>${escapeHtml(story.title)}</div></div>
                                    </div>
                                    <div class="post-stats">❤️ ${story.likes || 0}</div>
                                </div>
                            `).join('');
                        }
                    })
                    .catch(e => console.error(e));
            } else if (type === 'writers') {
                db.collection('stories').get()
                    .then(snapshot => {
                        const writerStats = {};
                        snapshot.forEach(doc => {
                            const story = doc.data();
                            if (!writerStats[story.authorId]) {
                                writerStats[story.authorId] = { name: story.authorName, count: 0, likes: 0 };
                            }
                            writerStats[story.authorId].count++;
                            writerStats[story.authorId].likes += (story.likes || 0);
                        });
                        const topWriters = Object.entries(writerStats).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.likes - a.likes).slice(0, 10);
                        const container = document.getElementById('exploreContent');
                        if (container) {
                            container.innerHTML = topWriters.map(w => `
                                <div class="writer-card">
                                    <div class="writer-avatar">✍️</div>
                                    <div class="writer-info">
                                        <div class="writer-name">${escapeHtml(w.name)}</div>
                                        <div>📝 ${w.count} كتابة • ❤️ ${w.likes} إعجاب</div>
                                    </div>
                                </div>
                            `).join('');
                        }
                    })
                    .catch(e => console.error(e));
            }
        });
    });
    
    // تبويبات الترند
    const trendingTabs = document.querySelectorAll('.trending-tab');
    trendingTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            trendingTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTrending();
        });
    });
    
    // تبويبات لوحة التحكم
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadAdminPanel();
        });
    });
    
    // لوحة المتصدرين
    const rankTabs = document.querySelectorAll('.rank-tab');
    const rankingList = document.getElementById('rankingList');
    
    function updateRanking(type) {
        Promise.all([
            db.collection('stories').get(),
            db.collection('users').get()
        ]).then(([storiesSnapshot, usersSnapshot]) => {
            const stories = [];
            storiesSnapshot.forEach(doc => stories.push(doc.data()));
            const users = [];
            usersSnapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
            
            let rankedUsers = [];
            if (type === 'rappers') {
                rankedUsers = users.map(u => ({
                    ...u,
                    score: stories.filter(s => s.authorId === u.id && (s.category === 'راب' || s.category === 'باتل')).length
                })).sort((a, b) => b.score - a.score).slice(0, 10);
            } else if (type === 'poets') {
                rankedUsers = users.map(u => ({
                    ...u,
                    score: stories.filter(s => s.authorId === u.id && (s.category === 'شعر' || s.category === 'غزل')).length
                })).sort((a, b) => b.score - a.score).slice(0, 10);
            } else {
                rankedUsers = users.map(u => ({
                    ...u,
                    score: stories.filter(s => s.authorId === u.id).reduce((sum, s) => sum + (s.likes || 0) + (s.views || 0), 0)
                })).sort((a, b) => b.score - a.score).slice(0, 10);
            }
            
            if (rankingList) {
                rankingList.innerHTML = rankedUsers.map((u, i) => `
                    <div class="ranking-item">
                        <div class="rank-num">${i+1}</div>
                        <div class="rank-info">
                            <span class="rank-name">${escapeHtml(u.name)}</span>
                            <span class="rank-score">${u.score} نقطة</span>
                        </div>
                        <span class="rank-level">${u.role === 'admin' ? 'مدير' : (u.role === 'moderator' ? 'مشرف' : `مستوى ${u.level || 1}`)}</span>
                    </div>
                `).join('');
            }
        }).catch(e => console.error(e));
    }
    
    rankTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            rankTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateRanking(tab.getAttribute('data-rank'));
        });
    });
    updateRanking('rappers');
}

// ========== 30. تحسين القوائم المنسدلة للتابلت ==========
function fixDropdownsForTablet() {
    const dropdownBtns = document.querySelectorAll('.nav-dropdown-btn');
    dropdownBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = this.closest('.nav-dropdown');
            const menu = dropdown.querySelector('.nav-dropdown-menu');
            if (menu) {
                document.querySelectorAll('.nav-dropdown-menu').forEach(m => {
                    if (m !== menu) m.classList.remove('show');
                });
                menu.classList.toggle('show');
            }
        });
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.nav-dropdown-menu').forEach(menu => menu.classList.remove('show'));
    });
}

function initAdminBattleControls() {
    const isAdmin = currentUser && (currentUser.role === 'admin');
    document.querySelectorAll('.admin-battle-control').forEach(btn => {
        btn.style.display = isAdmin ? 'inline-flex' : 'none';
    });
}

// ========== 31. التحميل النهائي للصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 جاري تحميل منصة قلم ومايك مع Firebase...');
    
    applyDarkMode();
    initStars();
    updateStats();
    updateNavUser();
    updateAdminButtons();
    updateGreeting();
    updateOnlineStatus();
    updateLastUpdate();
    loadDailyWord();
    setupSearch();
    setupFilters();
    fixDropdownsForTablet();
    initAdminBattleControls();
    
    if (document.getElementById('shareFacebook') || document.getElementById('copyLinkBtn')) {
        initShareButtons();
    }
    
    const rollBtn = document.getElementById('rollTopicBtn');
    if (rollBtn) rollBtn.onclick = randomTopic;
    
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) darkToggle.onclick = cycleDarkMode;
    
    const darkLevelBtn = document.getElementById('darkModeLevelBtn');
    if (darkLevelBtn) darkLevelBtn.onclick = cycleDarkMode;
    
    const shareBtn = document.getElementById('shareSiteBtn');
    if (shareBtn) shareBtn.onclick = shareSite;
    
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) navToggle.onclick = () => navMenu.classList.toggle('active');
    
    const exploreSearchBtn = document.getElementById('exploreSearchBtn');
    if (exploreSearchBtn) exploreSearchBtn.onclick = searchExplore;
    
    const createGroupBtn = document.getElementById('createGroupBtn');
    if (createGroupBtn) createGroupBtn.onclick = openCreateGroupModal;
    
    if (document.getElementById('storiesGrid')) loadStories();
    if (document.getElementById('storyDetails')) loadStoryDetails();
    if (document.getElementById('myStoriesList')) loadMyStories();
    if (document.getElementById('beatsGrid')) loadBeats();
    if (document.getElementById('memesGrid')) loadMemes();
    if (document.getElementById('activeTournaments')) loadTournaments();
    if (document.getElementById('weeklyBattleTopic')) loadWeeklyBattle();
    if (document.getElementById('exploreContent')) loadExplore();
    if (document.getElementById('trendingContent')) loadTrending();
    if (document.getElementById('hashtagName')) loadHashtagPage();
    if (document.getElementById('adminContent')) loadAdminPanel();
    if (document.getElementById('notificationsPageContent')) loadNotifications();
    if (document.getElementById('chatList')) loadChatList();
    if (document.getElementById('profileContainer')) loadProfile();
    if (document.getElementById('settingsContainer')) loadSettings();
    
    const publishForm = document.getElementById('addStoryForm');
    if (publishForm) publishForm.onsubmit = addStory;
    
    const joinWeekly = document.getElementById('joinWeeklyBattleBtn');
    if (joinWeekly) joinWeekly.onclick = joinWeeklyBattle;
    
    const sendMsgBtn = document.getElementById('sendMessageBtn');
    if (sendMsgBtn) sendMsgBtn.onclick = sendMessage;
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
    
    if (window.location.pathname.includes('add-story.html') && localStorage.getItem('editStoryId')) loadEditStory();
    
    const storyInputs = ['storyTitle', 'storyContent', 'storyCategory'];
    storyInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateLivePreview);
    });
    
    setTimeout(() => {
        const loading = document.getElementById('loadingScreen');
        const main = document.getElementById('mainContent');
        if (loading && main) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
                main.style.display = 'block';
            }, 500);
        }
    }, 800);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    setInterval(() => {
        updateStats();
        updateGreeting();
        updateOnlineStatus();
        if (document.getElementById('weeklyDeadline')) loadWeeklyBattle();
    }, 60000);
    
    console.log('✅ تم تحميل المنصة بنجاح مع Firebase!');
});

console.log('✅ جميع دوال قلم ومايك جاهزة للعمل مع Firebase');