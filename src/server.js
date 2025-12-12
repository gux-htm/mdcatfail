const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const path = require('path');

const app = express();
const MONGODB_URI = 'mongodb://localhost:27017/mdcatfail';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI })
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use('/auth', require('./routes/auth'));

const { ensureAuthenticated } = require('./middleware/authMiddleware');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Material = require('./models/Material');
const User = require('./models/User');

app.get('/', (req, res) => req.session.user ? res.redirect('/dashboard') : res.render('index'));

app.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ student: req.session.user._id }).populate('course');
        let createdCourses = [];
        if (req.session.user.role === 'teacher') {
            createdCourses = await Course.find({ instructor: req.session.user._id });
        }

        const userWithCourses = {
            ...req.session.user,
            enrolledCourses: enrollments.map(e => ({
                courseId: e.course._id,
                courseTitle: e.course.title,
                instructorName: "Instructor",
                startDate: e.enrollmentDate ? e.enrollmentDate.toDateString() : 'N/A',
                progress: e.progress
            })),
            createdCourses
        };
        res.render('dashboard', { user: userWithCourses });
    } catch (e) {
        console.error(e);
        res.status(500).send("Dashboard Error");
    }
});

app.get('/courses', async (req, res) => {
    const courses = await Course.find();
    res.render('courses', { courses });
});

app.post('/enroll', ensureAuthenticated, async (req, res) => {
    const { courseId } = req.body;
    if (!await Enrollment.findOne({ student: req.session.user._id, course: courseId })) {
        await new Enrollment({ student: req.session.user._id, course: courseId }).save();
    }
    res.redirect('/dashboard');
});

// Teacher Routes
app.post('/course/create', ensureAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'teacher' && req.session.user.role !== 'admin') {
        return res.status(403).send('Access Denied');
    }
    const { title, description, fee, scheduleDays, scheduleTime } = req.body;
    await Course.create({
        title,
        description,
        fee,
        instructor: req.session.user._id,
        schedule: {
            days: scheduleDays ? scheduleDays.split(',').map(d => d.trim()) : [],
            time: scheduleTime
        }
    });
    res.redirect('/dashboard');
});

app.post('/course/update-link', ensureAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'teacher') return res.status(403).send('Access Denied');
    const { courseId, liveClassLink } = req.body;
    await Course.findOneAndUpdate({ _id: courseId, instructor: req.session.user._id }, { liveClassLink });
    res.redirect('/dashboard');
});

app.post('/material/add', ensureAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'teacher') return res.status(403).send('Access Denied');
    const { courseId, title, type, url } = req.body;
    await Material.create({
        course: courseId,
        title,
        type,
        url,
        uploadedBy: req.session.user._id
    });
    res.redirect('/dashboard');
});

// Profile Routes
app.get('/profile', ensureAuthenticated, async (req, res) => {
    // Refresh user data from DB
    const user = await User.findById(req.session.user._id);
    res.render('profile', { user });
});

app.post('/profile/update', ensureAuthenticated, async (req, res) => {
    const { bio, goals, qualifications } = req.body;
    const user = await User.findById(req.session.user._id);
    if (bio) user.bio = bio;
    if (goals) user.goals = goals;
    if (qualifications) user.qualifications = qualifications;
    await user.save();
    req.session.user = user;
    res.redirect('/profile');
});

// View Course Records (Teacher)
app.get('/course/:id/records', ensureAuthenticated, async (req, res) => {
    if (req.session.user.role !== 'teacher') return res.status(403).send('Access Denied');
    const course = await Course.findById(req.params.id);
    const enrollments = await Enrollment.find({ course: req.params.id }).populate('student');
    res.render('course_record', { course, enrollments });
});

app.get('/about', (req, res) => res.render('about'));
app.get('/contact', (req, res) => res.render('contact'));
app.get('/about/gulraiz', (req, res) => res.sendFile(path.join(__dirname, '..', 'mycv.html')));
app.get('/about/shahwaiz', (req, res) => res.sendFile(path.join(__dirname, '..', 'shawaizcv.html')));
app.get('/about/wahab', (req, res) => res.sendFile(path.join(__dirname, '..', 'WahabCV.html')));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
