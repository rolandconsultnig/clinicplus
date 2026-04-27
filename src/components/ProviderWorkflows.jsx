/**
 * Provider Workflows Component
 * Clinical workflow automation and templates
 */
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  Workflow, 
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Copy,
  Trash2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Save,
  X
} from 'lucide-react'
import apiService from '../services/apiService'

export default function ProviderWorkflows() {
  const [workflows, setWorkflows] = useState([])
  const [templates, setTemplates] = useState([])
  const [activeWorkflows, setActiveWorkflows] = useState([])
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    category: 'General',
    duration: '',
    steps: []
  })
  const [currentStep, setCurrentStep] = useState({
    name: '',
    description: '',
    order: 1,
    required: true,
    estimated_time: ''
  })

  useEffect(() => {
    loadWorkflows()
    loadTemplates()
    loadActiveWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      const response = await apiService.request('/provider-workflows/workflows')
      setWorkflows(response.workflows || [])
    } catch (error) {
      console.error('Error loading workflows:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await apiService.request('/provider-workflows/templates')
      setTemplates(response.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const loadActiveWorkflows = async () => {
    try {
      const response = await apiService.request('/provider-workflows/active')
      setActiveWorkflows(response.active || [])
    } catch (error) {
      console.error('Error loading active workflows:', error)
    }
  }

  const startWorkflow = async (workflowId, patientId) => {
    try {
      await apiService.request('/provider-workflows/start', {
        method: 'POST',
        body: JSON.stringify({ workflow_id: workflowId, patient_id: patientId })
      })
      alert('Workflow started successfully')
      loadActiveWorkflows()
    } catch (error) {
      alert('Failed to start workflow: ' + error.message)
    }
  }

  const completeStep = async (workflowInstanceId, stepId) => {
    try {
      await apiService.request(`/provider-workflows/${workflowInstanceId}/step/${stepId}/complete`, {
        method: 'POST'
      })
      loadActiveWorkflows()
    } catch (error) {
      alert('Failed to complete step: ' + error.message)
    }
  }

  const addStep = () => {
    if (!currentStep.name || !currentStep.description) {
      alert('Please fill in step name and description')
      return
    }

    const newStep = {
      ...currentStep,
      id: Date.now(),
      order: workflowForm.steps.length + 1
    }

    setWorkflowForm({
      ...workflowForm,
      steps: [...workflowForm.steps, newStep]
    })

    setCurrentStep({
      name: '',
      description: '',
      order: workflowForm.steps.length + 2,
      required: true,
      estimated_time: ''
    })
  }

  const removeStep = (stepId) => {
    setWorkflowForm({
      ...workflowForm,
      steps: workflowForm.steps.filter(s => s.id !== stepId)
    })
  }

  const moveStep = (index, direction) => {
    const newSteps = [...workflowForm.steps]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= newSteps.length) return
    
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]]
    
    // Update order numbers
    newSteps.forEach((step, i) => {
      step.order = i + 1
    })
    
    setWorkflowForm({
      ...workflowForm,
      steps: newSteps
    })
  }

  const saveWorkflow = async () => {
    if (!workflowForm.name || workflowForm.steps.length === 0) {
      alert('Please provide workflow name and at least one step')
      return
    }

    try {
      const response = await apiService.request('/provider-workflows/create', {
        method: 'POST',
        body: JSON.stringify(workflowForm)
      })

      if (response.success) {
        alert('Workflow created successfully!')
        setShowBuilder(false)
        setWorkflowForm({
          name: '',
          description: '',
          category: 'General',
          duration: '',
          steps: []
        })
        loadWorkflows()
        loadTemplates()
      }
    } catch (error) {
      alert('Failed to create workflow: ' + error.message)
    }
  }

  const deleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      await apiService.request(`/provider-workflows/${workflowId}`, {
        method: 'DELETE'
      })
      alert('Workflow deleted successfully')
      loadWorkflows()
      loadTemplates()
    } catch (error) {
      alert('Failed to delete workflow: ' + error.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-teal-100 text-teal-800'
      case 'paused': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Workflow className="w-8 h-8 text-teal-700" />
            Provider Workflows
          </h1>
          <p className="text-gray-600 mt-1">Automate clinical workflows and protocols</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBuilder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
          <Button onClick={loadActiveWorkflows} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Workflow Builder Modal */}
      {showBuilder && (
        <Card className="border-2 border-teal-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Workflow</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowBuilder(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Workflow Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Workflow Name *</Label>
                  <Input
                    value={workflowForm.name}
                    onChange={(e) => setWorkflowForm({...workflowForm, name: e.target.value})}
                    placeholder="e.g., New Patient Intake"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={workflowForm.category}
                    onChange={(e) => setWorkflowForm({...workflowForm, category: e.target.value})}
                  >
                    <option value="General">General</option>
                    <option value="Registration">Registration</option>
                    <option value="Preventive">Preventive</option>
                    <option value="Chronic Care">Chronic Care</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={workflowForm.description}
                    onChange={(e) => setWorkflowForm({...workflowForm, description: e.target.value})}
                    placeholder="Brief description of the workflow"
                  />
                </div>
                <div>
                  <Label>Estimated Duration</Label>
                  <Input
                    value={workflowForm.duration}
                    onChange={(e) => setWorkflowForm({...workflowForm, duration: e.target.value})}
                    placeholder="e.g., 30-45 minutes"
                  />
                </div>
              </div>

              {/* Steps Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Workflow Steps ({workflowForm.steps.length})</h3>
                
                {/* Add Step Form */}
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <h4 className="font-medium mb-3">Add Step</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Step Name *</Label>
                      <Input
                        value={currentStep.name}
                        onChange={(e) => setCurrentStep({...currentStep, name: e.target.value})}
                        placeholder="e.g., Patient Registration"
                      />
                    </div>
                    <div>
                      <Label>Estimated Time</Label>
                      <Input
                        value={currentStep.estimated_time}
                        onChange={(e) => setCurrentStep({...currentStep, estimated_time: e.target.value})}
                        placeholder="e.g., 5 minutes"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Description *</Label>
                      <Input
                        value={currentStep.description}
                        onChange={(e) => setCurrentStep({...currentStep, description: e.target.value})}
                        placeholder="What needs to be done in this step"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={currentStep.required}
                        onChange={(e) => setCurrentStep({...currentStep, required: e.target.checked})}
                      />
                      <Label>Required Step</Label>
                    </div>
                  </div>
                  <Button onClick={addStep} className="mt-3" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Step
                  </Button>
                </div>

                {/* Steps List */}
                <div className="space-y-2">
                  {workflowForm.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-2 p-3 border rounded-lg bg-white">
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveStep(index, 'down')}
                          disabled={index === workflowForm.steps.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Step {step.order}</Badge>
                          <h4 className="font-semibold">{step.name}</h4>
                          {step.required && <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.estimated_time && (
                          <p className="text-xs text-gray-500">Est. time: {step.estimated_time}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" onClick={() => setShowBuilder(false)}>
                  Cancel
                </Button>
                <Button onClick={saveWorkflow}>
                  <Save className="w-4 h-4 mr-1" />
                  Save Workflow
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Workflows ({activeWorkflows.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="library">Workflow Library</TabsTrigger>
        </TabsList>

        {/* Active Workflows */}
        <TabsContent value="active" className="space-y-4">
          {activeWorkflows.length > 0 ? (
            activeWorkflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{workflow.workflow_name}</CardTitle>
                      <CardDescription>
                        Patient: {workflow.patient_name} | Started: {new Date(workflow.started_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-semibold">
                        {workflow.completed_steps}/{workflow.total_steps} steps
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-600 h-2 rounded-full"
                        style={{ width: `${(workflow.completed_steps / workflow.total_steps) * 100}%` }}
                      />
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      {workflow.steps?.map((step, index) => (
                        <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {step.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : step.current ? (
                              <Clock className="w-5 h-5 text-teal-700" />
                            ) : (
                              <div className="w-5 h-5 border-2 rounded-full" />
                            )}
                            <div>
                              <p className="font-medium">{step.name}</p>
                              <p className="text-sm text-gray-600">{step.description}</p>
                            </div>
                          </div>
                          {step.current && !step.completed && (
                            <Button 
                              size="sm"
                              onClick={() => completeStep(workflow.id, step.id)}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Workflow className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>No active workflows</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    <Badge variant="outline">{template.category}</Badge>
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Steps:</span>
                      <span className="font-semibold">{template.step_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Est. Duration:</span>
                      <span className="font-semibold">{template.duration}</span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          const patientId = prompt('Enter Patient ID:')
                          if (patientId) startWorkflow(template.id, patientId)
                        }}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteWorkflow(template.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Workflow Library */}
        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Workflow Library</CardTitle>
              <CardDescription>Pre-built workflows for common clinical scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              {workflows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="hover:bg-gray-50 cursor-pointer">
                      <CardContent className="pt-6">
                        <h4 className="font-semibold mb-2">{workflow.name}</h4>
                        <div className="flex items-center justify-between text-sm">
                          <Badge variant="outline">{workflow.category}</Badge>
                          <span className="text-gray-600">{workflow.step_count} steps</span>
                        </div>
                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => {
                            const patientId = prompt('Enter Patient ID:')
                            if (patientId) startWorkflow(workflow.id, patientId)
                          }}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start Workflow
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No workflow templates available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
