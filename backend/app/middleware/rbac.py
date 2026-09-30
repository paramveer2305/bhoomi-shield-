"""
Role-Based Access Control (RBAC) Middleware
Enforces granular permissions across 4 distinct user roles
"""
from fastapi import HTTPException, status
from functools import wraps
from typing import List, Callable
import logging
from app.utils.auth import require_roles

logger = logging.getLogger(__name__)

require_admin = require_roles(["SYSTEM_ADMIN", "admin"])


# Role hierarchy and permissions
# Two-role hierarchy and permissions: Citizen and Officer
ROLE_PERMISSIONS = {
    'CITIZEN': {
        'parcels': ['read_own'],
        'documents': ['read_own', 'upload_own'],
        'alerts': ['read_own'],
        'cases': ['read_own'],
        'reports': ['check_public'],
        'verification': [],
    },
    'OFFICER': {
        'parcels': ['read_all', 'read_own', 'update_all', '*'],
        'documents': ['read_all', 'upload_own', 'upload_any', 'verify', '*'],
        'alerts': ['read_all', 'create', 'update', 'resolve', '*'],
        'cases': ['read_all', 'read_assigned', 'update_assigned', 'create', 'update', 'assign', 'resolve', '*'],
        'verification': ['submit_field_report', 'upload_evidence', 'initiate', 'approve', 'reject', '*'],
        'measurements': ['create', 'update', '*'],
        'risk': ['read_all', 'trigger_analysis', '*'],
        'reports': ['export_comprehensive', '*'],
        'users': ['*'],
        'system': ['*'],
    },
    # Backward compatibility aliases mapped to OFFICER:
    'REVENUE_OFFICER': {
        'parcels': ['read_all', 'update_all', '*'],
        'documents': ['read_all', 'upload_any', 'verify', '*'],
        'alerts': ['read_all', 'create', 'update', 'resolve', '*'],
        'cases': ['read_all', 'create', 'update', 'assign', 'resolve', '*'],
        'verification': ['initiate', 'approve', 'reject', '*'],
        'risk': ['read_all', 'trigger_analysis', '*'],
        'reports': ['export_comprehensive', '*'],
    },
    'FIELD_PATWARI': {
        'parcels': ['read_all', 'read_own', '*'],
        'documents': ['read_all', 'upload_own', 'upload_any', '*'],
        'alerts': ['read_all', '*'],
        'cases': ['read_assigned', 'update_assigned', '*'],
        'verification': ['submit_field_report', 'upload_evidence', '*'],
        'measurements': ['create', 'update', '*'],
    },
    'SYSTEM_ADMIN': {
        'parcels': ['*'],
        'documents': ['*'],
        'alerts': ['*'],
        'cases': ['*'],
        'verification': ['*'],
        'risk': ['*'],
        'users': ['*'],
        'system': ['*'],
        'reports': ['*'],
    },
}

# Resource ownership checks
OWNERSHIP_CHECKS = {
    'parcel': lambda user, resource: resource.get('owner_name') == user.get('full_name'),
    'case': lambda user, resource: resource.get('assigned_to') == user.get('user_id'),
    'document': lambda user, resource: resource.get('uploaded_by') == user.get('user_id'),
}


def check_permission(user: dict, resource: str, action: str, resource_data: dict = None) -> bool:
    """
    Check if user has permission to perform action on resource

    Args:
        user: User object with role and user_id
        resource: Resource type (e.g., 'parcels', 'alerts')
        action: Action to perform (e.g., 'read_all', 'update')
        resource_data: Optional resource data for ownership checks

    Returns:
        bool: True if user has permission, False otherwise
    """
    raw_role = user.get('role', 'CITIZEN').upper()
    officer_aliases = {'OFFICER', 'REVENUE_OFFICER', 'FIELD_PATWARI', 'PATWARI', 'TEHSILDAR', 'SYSTEM_ADMIN', 'ADMIN'}
    user_role = 'OFFICER' if raw_role in officer_aliases else 'CITIZEN'

    # Admin/Officer has all permissions
    if user_role == 'OFFICER' or raw_role == 'SYSTEM_ADMIN':
        role_perms = ROLE_PERMISSIONS.get('OFFICER', {})
    else:
        role_perms = ROLE_PERMISSIONS.get(user_role, {})

    resource_perms = role_perms.get(resource, [])

    # Check for wildcard permission
    if '*' in resource_perms:
        return True

    # Check for exact action match
    if action in resource_perms:
        return True

    # Check for _own actions with ownership validation
    if action.endswith('_own') and resource_data:
        base_action = action.replace('_own', '')
        if base_action in resource_perms or action in resource_perms:
            ownership_check = OWNERSHIP_CHECKS.get(resource)
            if ownership_check:
                return ownership_check(user, resource_data)

    logger.warning(
        f"Permission denied: User {user.get('username')} ({user_role}) "
        f"attempted {action} on {resource}"
    )
    return False


def require_permission(resource: str, action: str):
    """
    Decorator to enforce permission checks on route handlers
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('current_user') or kwargs.get('user')

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            resource_data = kwargs.get('resource_data')

            if not check_permission(user, resource, action, resource_data):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions to {action} on {resource}"
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


def require_role(allowed_roles: List[str]):
    """
    Decorator to enforce role-based access for two-role architecture:
    Citizen and Officer (with legacy role backward compatibility)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('current_user') or kwargs.get('user')

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )

            raw_role = user.get('role', 'CITIZEN').upper()
            officer_aliases = {'OFFICER', 'REVENUE_OFFICER', 'FIELD_PATWARI', 'PATWARI', 'TEHSILDAR', 'SYSTEM_ADMIN', 'ADMIN'}
            user_role = 'OFFICER' if raw_role in officer_aliases else 'CITIZEN'

            allowed_roles_upper = set(r.upper() for r in allowed_roles)
            is_officer_allowed = bool(allowed_roles_upper & officer_aliases)
            is_citizen_allowed = 'CITIZEN' in allowed_roles_upper

            if not ((user_role == 'OFFICER' and is_officer_allowed) or (user_role == 'CITIZEN' and is_citizen_allowed) or raw_role in allowed_roles_upper):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access restricted to roles: {', '.join(allowed_roles)}"
                )

            return await func(*args, **kwargs)

        return wrapper
    return decorator


# Audit logging for permission checks
async def log_access_attempt(
    user: dict,
    resource: str,
    action: str,
    allowed: bool,
    ip_address: str = None
):
    """
    Log access attempts for security auditing
    """
    from app.database import get_database
    from datetime import datetime, timezone

    db = get_database()

    audit_entry = {
        "timestamp": datetime.now(timezone.utc),
        "user_id": user.get('user_id'),
        "username": user.get('username'),
        "role": user.get('role'),
        "resource": resource,
        "action": action,
        "allowed": allowed,
        "ip_address": ip_address,
    }

    await db.audit_logs.insert_one(audit_entry)

    if not allowed:
        logger.warning(
            f"SECURITY: Unauthorized access attempt by {user.get('username')} "
            f"to {action} on {resource} from {ip_address}"
        )
