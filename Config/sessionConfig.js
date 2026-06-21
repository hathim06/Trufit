const createSessionConfig = (secret) => ({
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 72
    }
});

export default createSessionConfig;
