// src/service/taskService.js
import api from './api'

export const createTask = (workspaceId, data) =>
  api.post(`/api/tasks/${workspaceId}`, data)

export const getTasks = (workspaceId) =>
  api.get(`/api/tasks/${workspaceId}`)

export const updateTask = (workspaceId, taskId, data) =>
  api.put(`/api/tasks/${workspaceId}/${taskId}`, data)

export const deleteTask = (workspaceId, taskId) =>
  api.delete(`/api/tasks/${workspaceId}/${taskId}`)