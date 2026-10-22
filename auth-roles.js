(function () {
    var LEVELS = { customer: 0, staff: 1, co_owner: 2, owner: 3 };
    var LABELS = { customer: 'Customer', staff: 'Staff', co_owner: 'Co-Owner', owner: 'Owner' };

    function sb() {
        return window.supabaseClient;
    }

    function atLeast(role, min) {
        return (LEVELS[role] || 0) >= (LEVELS[min] || 0);
    }

    async function getSession() {
        var client = sb();
        if (!client) return null;
        var res = await client.auth.getSession();
        return res.data.session || null;
    }

    async function getUser() {
        var session = await getSession();
        return session ? session.user : null;
    }

    async function getProfile() {
        var user = await getUser();
        if (!user) return null;
        var client = sb();
        var res = await client
            .from('profiles')
            .select('id, username, discord_id, avatar, role')
            .eq('id', user.id)
            .maybeSingle();
        var profile = res.data;
        if (res.error) {
            var retry = await client
                .from('profiles')
                .select('id, username, discord_id, avatar')
                .eq('id', user.id)
                .maybeSingle();
            profile = retry.data;
        }
        if (!profile) {
            return { id: user.id, username: user.user_metadata && user.user_metadata.username, role: 'customer', avatar: null, discord_id: null };
        }
        if (!profile.role) profile.role = 'customer';
        return profile;
    }

    async function getRole() {
        var profile = await getProfile();
        return profile ? profile.role : null;
    }

    // Resolves to profile if user has at least `min` role, else null (and redirects if redirect=true)
    async function require(min, opts) {
        opts = opts || {};
        var profile = await getProfile();
        if (!profile) {
            if (opts.redirect !== false) window.location.href = '/login/';
            return null;
        }
        if (!atLeast(profile.role, min)) {
            if (opts.redirect !== false) window.location.href = '/dashboard/';
            return null;
        }
        return profile;
    }

    window.VadeRoles = {
        LEVELS: LEVELS,
        LABELS: LABELS,
        atLeast: atLeast,
        getSession: getSession,
        getUser: getUser,
        getProfile: getProfile,
        getRole: getRole,
        require: require
    };
})();
