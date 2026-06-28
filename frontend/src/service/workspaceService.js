// src/service/workspaceService.js
import api from './api'

export const createWorkspace = (data) =>
  api.post('/api/workspaces/', data)

export const getMyWorkspaces = () =>
  api.get('/api/workspaces/')

export const getWorkspace = (id) =>
  api.get(`/api/workspaces/${id}`)

export const inviteMember = (workspaceId, data) =>
  api.post(`/api/workspaces/${workspaceId}/invite`, data)

export const deleteWorkspace = (workspaceId) =>
  api.delete(`/api/workspaces/${workspaceId}`)

export const removeMember = (workspaceId, userId) => 
  api.delete(`/api/workspaces/${workspaceId}/members/${userId}`)