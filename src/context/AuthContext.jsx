import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    async function loadProfile(userId) {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (error) {
            console.error("Error loading profile:", error);
            setProfile(null);
            return null;
        }

        setProfile(data);
        return data;
    }

    useEffect(() => {
        let mounted = true;

        async function initializeAuth() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!mounted) return;

            setSession(session);

            if (session?.user) {
                await loadProfile(session.user.id);
            }

            if (mounted) {
                setLoading(false);
            }
        }

        initializeAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            setSession(session);

            if (session?.user) {
                await loadProfile(session.user.id);
            } else {
                setProfile(null);
            }

            if (mounted) {
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function signIn(email, password) {
        return await supabase.auth.signInWithPassword({
            email,
            password,
        });
    }

    async function signUp(email, password, fullName) {
        return await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
    }

    async function signOut() {
        return await supabase.auth.signOut();
    }

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                profile,
                loading,
                signIn,
                signUp,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}