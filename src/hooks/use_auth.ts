import { useEffect } from "preact/hooks";
import { 
    auth_state, is_authenticated, is_loading, current_user, auth_error,
    set_authenticated, set_unauthenticated, set_loading, clear_error
} from '../stores/auth.store';
import {
    validate_license, check_existing_session, logout as logout_service
} from '../services/auth/auth.service';

export function use_auth() {
    useEffect(() => {
        const { valid, user } = check_existing_session();
        if (valid && user) set_authenticated(user);
        else set_unauthenticated();
    }, []);

    const login = async (license_key: string): Promise<boolean> => {
        set_loading();
        clear_error();

        const result = await validate_license(license_key);

        if (result.success && result.valid && result.user) {
            set_authenticated(result.user)
            return true;
        } else {
            set_unauthenticated(result.error);
            return false;
        }
    }

    const logout = (): void => {
        logout_service();
        set_unauthenticated();
    }

    return {
        state: auth_state,
        is_authenticated,
        is_loading,
        user: current_user,
        error: auth_error,
        login,
        logout,
        clear_error,
    }
}