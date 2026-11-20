import { useCallback, useEffect, useState } from 'react'
import { getServiceErrorMessage } from '../services/errorMessage'
import { userService } from '../services/userService'
import type {
  ProfessorProfileUpdate,
  StudentProfileUpdate,
  UserProfile,
  UserProfileDetails,
} from '../types/domain'
import { useAuth } from './useAuth'

export type ProfileUpdate =
  | { role: 'STUDENT'; update: StudentProfileUpdate }
  | { role: 'PROFESSOR'; update: ProfessorProfileUpdate }

interface ProfileLoadState {
  key: string
  profile: UserProfileDetails | null
  isLoading: boolean
  error: string | null
}

export function useProfile(profileId?: string) {
  const { user, updateUser } = useAuth()
  const [profileState, setProfileState] = useState<ProfileLoadState | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const isOwnProfile = Boolean(user && (!profileId || profileId === String(user.profile.id)))
  const requestKey = user ? `${user.profile.id}:${profileId ?? 'self'}` : 'anonymous'
  const currentState = profileState?.key === requestKey ? profileState : null
  const profile = currentState?.profile ?? null
  const isLoading = Boolean(user) && (!currentState || currentState.isLoading)
  const error = currentState?.error ?? null

  const fetchProfile = useCallback(async (): Promise<UserProfileDetails | null> => {
    if (!user) return null

    if (isOwnProfile) {
      const currentProfile = await userService.getCurrentProfile(user.role)
      if (currentProfile.role !== user.role || currentProfile.profile.id !== user.profile.id) {
        throw new Error('O perfil carregado não corresponde à sessão atual.')
      }
      return currentProfile
    }

    const requestedProfileId = Number(profileId)
    if (!Number.isSafeInteger(requestedProfileId) || requestedProfileId < 1) {
      throw new Error('O identificador do perfil é inválido.')
    }
    return userService.getProfileById(requestedProfileId)
  }, [isOwnProfile, profileId, user])

  useEffect(() => {
    if (!user) return

    let isCurrent = true
    fetchProfile()
      .then((loadedProfile) => {
        if (isCurrent) {
          setProfileState({
            key: requestKey,
            profile: loadedProfile,
            isLoading: false,
            error: null,
          })
        }
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setProfileState({
            key: requestKey,
            profile: null,
            isLoading: false,
            error: getServiceErrorMessage(loadError, 'Não foi possível carregar o perfil.'),
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [fetchProfile, requestKey, user])

  const reload = useCallback(async () => {
    setProfileState({
      key: requestKey,
      profile,
      isLoading: true,
      error: null,
    })
    try {
      setProfileState({
        key: requestKey,
        profile: await fetchProfile(),
        isLoading: false,
        error: null,
      })
    } catch (loadError) {
      setProfileState({
        key: requestKey,
        profile,
        isLoading: false,
        error: getServiceErrorMessage(loadError, 'Não foi possível carregar o perfil.'),
      })
    }
  }, [fetchProfile, profile, requestKey])

  const save = useCallback(async (profileUpdate: ProfileUpdate) => {
    if (!user || !isOwnProfile || profileUpdate.role !== user.role) {
      setProfileState((current) => ({
        key: requestKey,
        profile: current?.key === requestKey ? current.profile : null,
        isLoading: false,
        error: 'Não foi possível identificar o perfil que será atualizado.',
      }))
      return false
    }

    setIsSaving(true)
    setProfileState((current) => ({
      key: requestKey,
      profile: current?.key === requestKey ? current.profile : profile,
      isLoading: false,
      error: null,
    }))
    try {
      if (profileUpdate.role === 'STUDENT') {
        const updatedProfile = await userService.patchStudent(profileUpdate.update)
        const updatedUser: UserProfile = { role: 'STUDENT', profile: updatedProfile.profile }
        updateUser(updatedUser)
        setProfileState({
          key: requestKey,
          profile: updatedProfile,
          isLoading: false,
          error: null,
        })
      } else {
        const updatedProfile = await userService.patchProfessor(profileUpdate.update)
        const updatedUser: UserProfile = { role: 'PROFESSOR', profile: updatedProfile.profile }
        updateUser(updatedUser)
        setProfileState({
          key: requestKey,
          profile: updatedProfile,
          isLoading: false,
          error: null,
        })
      }
      return true
    } catch (saveError) {
      setProfileState((current) => ({
        key: requestKey,
        profile: current?.key === requestKey ? current.profile : profile,
        isLoading: false,
        error: getServiceErrorMessage(saveError, 'Não foi possível salvar as alterações do perfil.'),
      }))
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isOwnProfile, profile, requestKey, updateUser, user])

  return {
    profile,
    isLoading,
    isSaving,
    error,
    reload,
    save,
    isOwnProfile,
    supportsExtendedProfileFields: userService.supportsExtendedProfileFields,
  }
}
