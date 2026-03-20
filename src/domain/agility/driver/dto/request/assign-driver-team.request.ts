/**
 * DTO for assigning driver to team
 */
export interface AssignDriverTeamRequest {
    /** Team code - required */
    teamCode: string

    /** Supervisor name or ID - required */
    supervisor: string
}

