import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import CustomButton from '../buttons/CustomButton.jsx'
import Navbar from '../nav/Navbar.jsx'
import { serverUrl } from '../../../config.mjs'
import { PROPERTY_TYPES } from '../../constants/reportForm.js'
import styles from './Reports.module.css'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  }
}

function formatPropertyLabel(value) {
  const found = PROPERTY_TYPES.find((p) => p.value === value)
  return found ? found.label : value
}

function formatAssigneeRole(role) {
  if (!role) return '—'
  if (role === 'sideengineer') return 'Side engineer'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function listHeading(report) {
  const title = report.taskTitle?.trim()
  if (title) return title
  return formatPropertyLabel(report.propertyType)
}

function parseImageUrls(raw) {
  if (!raw || typeof raw !== 'string') return []
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatDocDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

export default function Reports() {
  const navigate = useNavigate()
  const pdfRef = useRef(null)
  const [user, setUser] = useState(null)
  const [viewMode, setViewMode] = useState('assigned')
  const [reports, setReports] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const [propertyType, setPropertyType] = useState('other')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [imagesRaw, setImagesRaw] = useState('')

  const selected = reports.find((r) => r._id === selectedId) ?? null

  const syncFormFromReport = useCallback((report) => {
    if (!report) {
      setPropertyType('other')
      setAddress('')
      setDescription('')
      setImagesRaw('')
      return
    }
    setPropertyType(report.propertyType || 'other')
    setAddress(report.address ?? '')
    setDescription(report.description ?? '')
    setImagesRaw((report.images || []).join('\n'))
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('user')
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    syncFormFromReport(selected)
  }, [selected, syncFormFromReport])

  const loadReports = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    setLoading(true)
    setListError('')
    setSelectedId(null)
    try {
      const path =
        viewMode === 'assigned' ? '/getreports' : '/mycreatedreports'
      const res = await axios.get(`${serverUrl}${path}`, {
        headers: authHeaders(),
      })
      const list = res.data.reports ?? []
      setReports(list)
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login')
        return
      }
      setListError(
        err.response?.data?.message ?? 'Could not load reports. Try again.'
      )
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [viewMode, navigate])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selected) return
    setSaveError('')
    setSaveSuccess('')
    try {
      const res = await axios.put(
        `${serverUrl}/updatereport/${selected._id}`,
        {
          propertyType,
          address,
          description,
          images: parseImageUrls(imagesRaw),
        },
        { headers: authHeaders() }
      )
      const updated = res.data.report
      setReports((prev) =>
        prev.map((r) => (r._id === updated._id ? updated : r))
      )
      setSaveSuccess(res.data.message ?? 'Report saved.')
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login')
        return
      }
      setSaveError(
        err.response?.data?.message ?? 'Could not save report. Try again.'
      )
    }
  }

  const switchMode = (mode) => {
    setViewMode(mode)
    setSaveError('')
    setSaveSuccess('')
    setPdfError('')
  }

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !selected) return
    setPdfError('')
    setPdfBusy(true)
    try {
      const rawName = listHeading(selected) || 'report'
      const slug =
        rawName
          .replace(/[^a-z0-9]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'report'
      const idBit = String(selected._id || '').slice(-8)
      // Option B: Server-side Chrome "Print to PDF" for best quality.
      const url = `${serverUrl}/reports/${selected._id}/pdf`
      const res = await axios.get(url, {
        headers: authHeaders(),
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${slug}-${idBit}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (e) {
      console.error(e)
      setPdfError(
        'Could not generate PDF. If the report is very long, try again or contact support.'
      )
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <>
     <Navbar />
      <div className={styles.page}>
        <div className={styles.main}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <p className={styles.sidebarTitle}>Reports</p>
              <div className={styles.modeTabs}>
                <button
                  type="button"
                  className={`${styles.modeTab} ${viewMode === 'assigned' ? styles.modeTabActive : ''}`}
                  onClick={() => switchMode('assigned')}
                >
                  Assigned to me
                </button>
                <button
                  type="button"
                  className={`${styles.modeTab} ${viewMode === 'created' ? styles.modeTabActive : ''}`}
                  onClick={() => switchMode('created')}
                >
                  Created by me
                </button>
              </div>
              {user?.role && (
                <p className={styles.count}>
                  Role: <strong>{user.role}</strong>
                  {viewMode === 'assigned' && (
                    <span> — showing reports for your role</span>
                  )}
                  {viewMode === 'created' && (
                    <span> — reports you created</span>
                  )}
                </p>
              )}
            </div>
            <div className={styles.list}>
              {loading && (
                <div className={styles.empty}>
                  <div className={styles.spinner} aria-hidden />
                  Loading…
                </div>
              )}
              {!loading && listError && (
                <div className={styles.empty}>
                  <p className={styles.bannerError}>{listError}</p>
                </div>
              )}
              {!loading && !listError && reports.length === 0 && (
                <div className={styles.empty}>
                  <p className={styles.emptyTitle}>No reports yet</p>
                  <p>
                    {viewMode === 'assigned'
                      ? 'There are no reports assigned to your role right now.'
                      : 'You have not created any reports yet.'}
                  </p>
                </div>
              )}
              {!loading &&
                !listError &&
                reports.map((report) => (
                  <button
                    type="button"
                    key={report._id}
                    className={`${styles.listItem} ${selectedId === report._id ? styles.listItemSelected : ''}`}
                    onClick={() => {
                      setSelectedId(report._id)
                      setSaveError('')
                      setSaveSuccess('')
                      setPdfError('')
                    }}
                  >
                    <div className={styles.listItemTitle}>
                      {listHeading(report)}
                    </div>
                    <div className={styles.listItemMeta}>
                      {(() => {
                        const addr = (report.address || '').trim()
                        const addrDisp =
                          addr.length > 52 ? `${addr.slice(0, 52)}…` : addr
                        return [formatPropertyLabel(report.propertyType), addrDisp]
                          .filter(Boolean)
                          .join(' · ')
                      })()}
                    </div>
                    {report.updated ? (
                      <span className={styles.badge}>Updated</span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeDraft}`}>
                        Open
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </aside>

          <section className={styles.content}>
            {!selected ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Select a task</p>
                <p>
                  Open a task to read admin instructions and fill in the full
                  report (property, address, description, image URLs).
                </p>
              </div>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <h1 className={styles.detailTitle}>
                    {listHeading(selected)}
                  </h1>
                  <p className={styles.detailMeta}>
                    Assigned to:{' '}
                    <strong>{formatAssigneeRole(selected.assignedTo)}</strong>
                    {selected.updatedAt && (
                      <>
                        {' '}
                        · Last updated{' '}
                        {new Date(selected.updatedAt).toLocaleString()}
                      </>
                    )}
                  </p>
                </div>

                {selected.adminInstructions?.trim() ? (
                  <div className={styles.instructionCallout}>
                    <p className={styles.instructionLabel}>
                      Instructions from admin
                    </p>
                    <p className={styles.instructionBody}>
                      {selected.adminInstructions}
                    </p>
                  </div>
                ) : null}

                <div className={styles.docWrap}>
                  <div className={styles.docActions}>
                    <h2 className={styles.docActionsTitle}>
                      Full report snapshot
                    </h2>
                    <button
                      type="button"
                      className={styles.pdfBtn}
                      onClick={handleDownloadPdf}
                      disabled={pdfBusy}
                    >
                      {pdfBusy ? 'Building PDF…' : 'Download PDF'}
                    </button>
                  </div>

                  {pdfError && (
                    <p className={styles.bannerError} role="alert">
                      {pdfError}
                    </p>
                  )}

                  <article
                    ref={pdfRef}
                    className={styles.reportDocument}
                    aria-label="Report details for export"
                  >
                    <p className={styles.docBrand}>ReportMaker</p>
                    <h1 className={styles.docMainTitle}>
                      {listHeading(selected)}
                    </h1>

                    <section className={styles.docSection}>
                      <h3 className={styles.docSectionTitle}>
                        Overview & metadata
                      </h3>
                      <div className={styles.docGrid}>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Report ID</span>
                          <span className={`${styles.docV} ${styles.docMono}`}>
                            {String(selected._id)}
                          </span>
                        </div>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Status</span>
                          <span className={styles.docV}>
                            {selected.updated ? (
                              <span
                                className={`${styles.statusTag} ${styles.statusDone}`}
                              >
                                Submitted / updated
                              </span>
                            ) : (
                              <span
                                className={`${styles.statusTag} ${styles.statusOpen}`}
                              >
                                Open
                              </span>
                            )}
                          </span>
                        </div>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Assigned to (role)</span>
                          <span className={styles.docV}>
                            {formatAssigneeRole(selected.assignedTo)}
                          </span>
                        </div>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Created by (user ID)</span>
                          <span className={`${styles.docV} ${styles.docMono}`}>
                            {selected.userId
                              ? String(selected.userId)
                              : '—'}
                          </span>
                        </div>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Created</span>
                          <span className={styles.docV}>
                            {formatDocDate(selected.createdAt)}
                          </span>
                        </div>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Last updated</span>
                          <span className={styles.docV}>
                            {formatDocDate(selected.updatedAt)}
                          </span>
                        </div>
                        {selected.updatedBy ? (
                          <div className={styles.docPair}>
                            <span className={styles.docK}>Last edited by</span>
                            <span className={`${styles.docV} ${styles.docMono}`}>
                              {String(selected.updatedBy)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </section>

                    {selected.adminInstructions?.trim() ? (
                      <section className={styles.docSection}>
                        <h3 className={styles.docSectionTitle}>
                          Admin instructions
                        </h3>
                        <p className={styles.docBody}>
                          {selected.adminInstructions}
                        </p>
                      </section>
                    ) : null}

                    <section className={styles.docSection}>
                      <h3 className={styles.docSectionTitle}>
                        Property & location
                      </h3>
                      <div className={styles.docGrid}>
                        <div className={styles.docPair}>
                          <span className={styles.docK}>Property type</span>
                          <span className={styles.docV}>
                            {formatPropertyLabel(selected.propertyType)}
                          </span>
                        </div>
                        <div className={`${styles.docPair} ${styles.docGridFull}`}>
                          <span className={styles.docK}>Address</span>
                          <span className={styles.docV}>
                            {(selected.address || '').trim() || '—'}
                          </span>
                        </div>
                      </div>
                    </section>

                    <section className={styles.docSection}>
                      <h3 className={styles.docSectionTitle}>
                        Report description
                      </h3>
                      {(selected.description || '').trim() ? (
                        <p className={styles.docBody}>{selected.description}</p>
                      ) : (
                        <p className={styles.docEmpty}>No description yet.</p>
                      )}
                    </section>

                    <section className={styles.docSection}>
                      <h3 className={styles.docSectionTitle}>
                        Images (URL references)
                      </h3>
                      {Array.isArray(selected.images) &&
                      selected.images.length > 0 ? (
                        <ul className={styles.docList}>
                          {selected.images.map((url, i) => (
                            <li key={`${url}-${i}`}>{url}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.docEmpty}>No image URLs listed.</p>
                      )}
                    </section>

                    <footer className={styles.docFooter}>
                      Generated {formatDocDate(new Date().toISOString())}
                    </footer>
                  </article>
                </div>

                {saveError && (
                  <p className={styles.bannerError} role="alert">
                    {saveError}
                  </p>
                )}
                {saveSuccess && (
                  <p className={styles.bannerSuccess} role="status">
                    {saveSuccess}
                  </p>
                )}

                <form className={styles.form} onSubmit={handleSave}>
                  <p className={styles.sectionLabel}>Complete the report</p>
                  <p className={styles.helperText}>
                    Update every field below to match the site. Image entries
                    can be full URLs, one per line or separated with commas.
                  </p>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="report-property">
                      Property type
                    </label>
                    <select
                      id="report-property"
                      className={styles.select}
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                    >
                      {PROPERTY_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="report-address">
                      Address
                    </label>
                    <input
                      id="report-address"
                      className={styles.input}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      autoComplete="street-address"
                    />
                  </div>

                  <div className={styles.field}>
                    <label
                      className={styles.label}
                      htmlFor="report-description"
                    >
                      Report description
                    </label>
                    <textarea
                      id="report-description"
                      className={styles.textarea}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Findings, measurements, compliance notes…"
                      rows={5}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="report-images">
                      Images (URLs)
                    </label>
                    <textarea
                      id="report-images"
                      className={styles.textarea}
                      value={imagesRaw}
                      onChange={(e) => setImagesRaw(e.target.value)}
                      placeholder="https://…&#10;https://…"
                      rows={4}
                    />
                  </div>

                  <div className={styles.actions}>
                    <CustomButton text="Save changes" style={styles.saveBtn} />
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
